import { useState, useEffect, useRef } from "react"
import { Text,View,StyleSheet,Button,FlatList,TouchableOpacity,ActivityIndicator,Alert,SafeAreaView,StatusBar,Platform} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Location from "expo-location"
import * as Clipboard from "expo-clipboard"
import { CameraView, type CameraType, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import * as Notifications from "expo-notifications"

import { connectDb, type Database } from "../src/database"
import type { ScannedCode } from "../src/models"
import styles from "./styles"

// Configuración de modo local y URL de API para sincronización remota
const isLocalMode = true
const API_URL = "http://localhost:3000"

// Configuración del manejador de notificaciones push
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Pantalla principal del escáner de QR.
 * Permite escanear códigos, almacenarlos localmente, sincronizarlos y gestionarlos.
 */
export default function QRScannerScreen() {
  // === ESTADOS ===
  const [location, setLocation] = useState<Location.LocationObject | null>(null) // Ubicación actual del dispositivo
  const [errorMsg, setErrorMsg] = useState<string | null>(null) // Mensaje de error para la ubicación
  const [facing, setFacing] = useState<CameraType>("back") // Cámara activa (frontal o trasera)
  const [permission, requestPermission] = useCameraPermissions() // Permisos de cámara
  const [scannedCodes, setScannedCodes] = useState<ScannedCode[]>([]) // Lista de códigos escaneados
  const [db, setDB] = useState<Database>() // Instancia de la base de datos local
  const [isSyncing, setIsSyncing] = useState(false) // Estado de sincronización con el servidor

  // === REFS PARA CONTROL DE ESCANEO ===
  const lastScannedCode = useRef<string>("") // Último código escaneado (no se usa, pero se deja por si se requiere)
  const lastScannedTime = useRef<number>(0) // Tiempo del último escaneo (no se usa, pero se deja por si se requiere)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Referencia para timeout de escaneo
  const isProcessingRef = useRef<boolean>(false) // Indica si se está procesando un escaneo

  // === CONSTANTES DE CONFIGURACIÓN ===
  const SCAN_COOLDOWN = 800 // Tiempo mínimo entre escaneos del mismo código (en ms)
  const PROCESSING_TIMEOUT = 400 // Tiempo de bloqueo tras un escaneo (en ms)

  /**
   * Efecto inicial: solicita ubicación y conecta a la base de datos.
   * También limpia el timeout al desmontar el componente.
   */
  useEffect(() => {
    // Solicita permisos y obtiene la ubicación actual
    async function getCurrentLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }
      const location = await Location.getCurrentPositionAsync({})
      setLocation(location)
    }

    // Conecta a la base de datos local y carga los códigos guardados
    async function retrieveLocalDbData() {
      try {
        const database = await connectDb()
        setDB(database)
        await updateData(database)
      } catch (error) {
        console.error("Error conectando a la base de datos:", error)
        Alert.alert("Error", "No se pudo conectar a la base de datos")
      }
    }

    getCurrentLocation()
    retrieveLocalDbData()

    // Limpieza al desmontar el componente
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Actualiza la lista de códigos escaneados desde la base de datos.
   * @param database Instancia de la base de datos
   */
  const updateData = async (database: Database) => {
    try {
      const codes = await database.consultarCodigos()
      setScannedCodes(codes)
    } catch (error) {
      console.error("Error actualizando datos:", error)
    }
  }

  /**
   * Maneja el evento de escaneo de un código de barras/QR.
   * Siempre inserta el código, aunque ya exista.
   */
  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    const scannedData = result.data

    isProcessingRef.current = true

    console.log("Procesando escaneo:", scannedData)

    try {
      if (db) {
        // Siempre inserta el código, aunque ya exista
        await showNotification(`Código escaneado: ${scannedData}`)
        await db.insertarCodigo(scannedData, result.type)
        await updateData(db)
      }
    } catch (error) {
      console.error("Error procesando escaneo:", error)
      Alert.alert("Error", "No se pudo procesar el código escaneado")
    } finally {
      // Desbloquea el escaneo tras un pequeño timeout
      scanTimeoutRef.current = setTimeout(() => {
        isProcessingRef.current = false
        console.log("Escaneo desbloqueado")
      }, PROCESSING_TIMEOUT)
    }
  }

  /**
   * Sincroniza los códigos escaneados con el servidor remoto.
   * Si está en modo local, solo muestra un mensaje.
   */
  const syncWithServer = async () => {
    if (!scannedCodes.length) {
      Alert.alert("Sincronización", "No hay códigos para sincronizar")
      return
    }

    setIsSyncing(true)

    try {
      if (isLocalMode) {
        setTimeout(() => {
          Alert.alert(
            "Modo Local",
            `Estás trabajando en modo local. Tienes ${scannedCodes.length} códigos almacenados localmente.`,
          )
          setIsSyncing(false)
        }, 500)
        return
      }

      for (const code of scannedCodes) {
        await fetch(`${API_URL}/codigos`, {
          method: "POST",
          headers: {
            Accept: "application/json;encoding=utf-8",
            "Content-Type": "application/json;encoding=utf-8",
          },
          body: JSON.stringify({
            data: code.data,
            type: code.type,
            timestamp: code.timestamp,
          }),
        })
      }

      Alert.alert("Sincronización Exitosa", `Se han sincronizado ${scannedCodes.length} códigos con el servidor`)
    } catch (error) {
      console.error("Error al sincronizar:", error)
      Alert.alert("Error de Sincronización", "No se pudieron sincronizar los códigos. Verifica tu conexión.")
    } finally {
      if (!isLocalMode) {
        setIsSyncing(false)
      }
    }
  }

  /**
   * Muestra una notificación local o del sistema.
   * @param message Mensaje a mostrar
   */
  const showNotification = async (message: string) => {
    try {
      if (Platform.OS === "web") {
        if (window.Notification && Notification.permission !== "denied") {
          const permission = await Notification.requestPermission()
          if (permission === "granted") {
            new Notification("QR Scanner", {
              body: message,
            })
          } else {
            Alert.alert("QR Scanner", message)
          }
        } else {
          Alert.alert("QR Scanner", message)
        }
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "QR Scanner",
            body: message,
          },
          trigger: null,
        })
      }
    } catch (error) {
      console.error("Error mostrando notificación:", error)
      Alert.alert("QR Scanner", message)
    }
  }

  /**
   * Limpia todos los códigos escaneados de la base de datos.
   * Solicita confirmación al usuario.
   */
  const clearScannedCodes = async () => {
    Alert.alert("Limpiar Historial", "¿Estás seguro de que quieres eliminar todos los códigos escaneados?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          if (db) {
            try {
              await db.limpiarCodigos()
              await updateData(db)
              Alert.alert("Éxito", "Historial limpiado")
            } catch (error) {
              console.error("Error limpiando códigos:", error)
              Alert.alert("Error", "No se pudo limpiar el historial")
            }
          }
        },
      },
    ])
  }

  /**
   * Elimina un código individual de la base de datos.
   * @param id ID del código a eliminar
   */
  const deleteCode = async (id: string) => {
    if (db) {
      try {
        await db.eliminarCodigo(id)
        await updateData(db)
      } catch (error) {
        console.error("Error eliminando código:", error)
        Alert.alert("Error", "No se pudo eliminar el código")
      }
    }
  }

  // === VERIFICACIÓN DE PERMISOS DE CÁMARA ===
  if (!permission) {
    return <View style={styles.container} />
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Se requiere permiso de cámara para usar esta app.</Text>
        <Button title="Conceder Permiso" onPress={requestPermission} />
      </View>
    )
  }

  // === PREPARACIÓN DE TEXTO DE UBICACIÓN ===
  let locationText = "Esperando ubicación..."
  if (errorMsg) {
    locationText = errorMsg
  } else if (location) {
    locationText = `Lat: ${location.coords.latitude.toFixed(4)}, Long: ${location.coords.longitude.toFixed(4)}`
  }

  /**
   * Componente para renderizar cada código escaneado en la lista.
   */
  const ScannedItem = ({ item }: { item: ScannedCode }) => {
    // Copia el texto del código al portapapeles
    const onCopyPress = () => {
      Clipboard.setStringAsync(item.data)
      Alert.alert("Copiado", "Texto copiado al portapapeles")
    }

    // Elimina el código tras confirmación
    const onDeletePress = () => {
      Alert.alert("Eliminar", "¿Estás seguro de que quieres eliminar este código?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteCode(item.id),
        },
      ])
    }

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemContent}>
          <Text style={styles.itemData} numberOfLines={2}>
            {item.data}
          </Text>
          <Text style={styles.itemType}>{item.type}</Text>
          {item.timestamp && <Text style={styles.itemTime}>{new Date(item.timestamp).toLocaleString()}</Text>}
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.copyButton} onPress={onCopyPress}>
            <Ionicons name="copy-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={onDeletePress}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // === RENDER PRINCIPAL ===
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header con título y ubicación */}
      <View style={styles.header}>
        <Text style={styles.title}>QR Scanner</Text>
        <Text style={styles.subtitle}>{locationText}</Text>
      </View>

      {/* Vista de la cámara para escanear códigos */}
      <CameraView
        facing={facing}
        style={styles.cameraView}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "datamatrix", "aztec"],
        }}
        onBarcodeScanned={onBarcodeScanned}
      >
        {/* Indicador de procesamiento mientras se guarda un código */}
        {isProcessingRef.current && (
          <View style={styles.scanOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.scanText}>Procesando código...</Text>
          </View>
        )}
      </CameraView>

      {/* Botones de acción: notificación, sincronizar y limpiar */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => showNotification("Prueba de notificación")}>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Notificaciones</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.syncButton]} onPress={syncWithServer} disabled={isSyncing}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Sincronizar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearScannedCodes}
          disabled={scannedCodes.length === 0}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de códigos escaneados */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Códigos Escaneados ({scannedCodes.length})</Text>

        {scannedCodes.length > 0 ? (
          <FlatList
            data={scannedCodes}
            keyExtractor={(item) => item.id}
            renderItem={ScannedItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="scan-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hay códigos escaneados</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
//hola