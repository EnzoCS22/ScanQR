import { useState, useEffect, useRef } from "react"
import { Text,View,StyleSheet,Button,FlatList,TouchableOpacity,ActivityIndicator,Alert,SafeAreaView,StatusBar,Platform} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as Location from "expo-location"
import * as Clipboard from "expo-clipboard"
import { CameraView, type CameraType, useCameraPermissions, type BarcodeScanningResult } from "expo-camera"
import * as Notifications from "expo-notifications"

// Importamos nuestras clases de base de datos local
import { connectDb, type Database } from "../src/database"
import type { ScannedCode } from "../src/models"
import styles from "./styles"

// === CONFIGURACIÓN DE MODO LOCAL ===
const isLocalMode = true
const API_URL = "http://localhost:3000"

// Configuración del manejador de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export default function QRScannerScreen() {
  // === ESTADOS ===
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [facing, setFacing] = useState<CameraType>("back")
  const [permission, requestPermission] = useCameraPermissions()
  const [scannedCodes, setScannedCodes] = useState<ScannedCode[]>([])
  const [db, setDB] = useState<Database>()
  const [isSyncing, setIsSyncing] = useState(false)
  const [stats, setStats] = useState<{ total: number; porTipo: any[]; ultimoEscaneo: string | null }>({
    total: 0,
    porTipo: [],
    ultimoEscaneo: null,
  })

  // === REFS PARA CONTROL DE ESCANEO ===
  const lastScannedCode = useRef<string>("")
  const lastScannedTime = useRef<number>(0)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef<boolean>(false)

  // === CONSTANTES DE CONFIGURACIÓN ===
  const SCAN_COOLDOWN = 3000 // 3 segundos entre escaneos del mismo código
  const PROCESSING_TIMEOUT = 1000 // 1 segundo para procesar un escaneo

  useEffect(() => {
    async function getCurrentLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setLocation(location)
    }

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

    // Cleanup al desmontar
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  // Función para actualizar datos y estadísticas
  const updateData = async (database: Database) => {
    try {
      const codes = await database.consultarCodigos()
      const statistics = await database.obtenerEstadisticas()
      setScannedCodes(codes)
      setStats(statistics)
    } catch (error) {
      console.error("Error actualizando datos:", error)
    }
  }

  // === FUNCIÓN DE ESCANEO ===
  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    const currentTime = Date.now()
    const scannedData = result.data

    //Verificar si ya estamos procesando
    if (isProcessingRef.current) {
      console.log("Escaneo ignorado: ya procesando")
      return
    }

    //Verificar si es el mismo código muy reciente
    if (lastScannedCode.current === scannedData && currentTime - lastScannedTime.current < SCAN_COOLDOWN) {
      console.log("scaneo ignorado: mismo código muy reciente")
      return
    }

    //Marcar como procesando
    isProcessingRef.current = true
    lastScannedCode.current = scannedData
    lastScannedTime.current = currentTime

    console.log("Procesando escaneo:", scannedData)

    try {
      if (db) {
        const existe = await db.existeCodigo(scannedData)
        if (existe) {
          await showNotification(`Código ya escaneado: ${scannedData}`)
        } else {
          // Mostrar notificación
          await showNotification(`Nuevo código escaneado: ${scannedData}`)

          // Guardar en base de datos
          await db.insertarCodigo(scannedData, result.type)
          await updateData(db)
        }
      }
    } catch (error) {
      console.error("Error procesando escaneo:", error)
      Alert.alert("Error", "No se pudo procesar el código escaneado")
    } finally {
      // 🔓 LIBERAR DESPUÉS DEL TIMEOUT
      scanTimeoutRef.current = setTimeout(() => {
        isProcessingRef.current = false
        console.log("Escaneo desbloqueado")
      }, PROCESSING_TIMEOUT)
    }
  }

  // === FUNCIÓN DE SINCRONIZACIÓN ===
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

  // === FUNCIÓN DE NOTIFICACIONES ===
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

  // === FUNCIÓN PARA LIMPIAR HISTORIAL ===
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

  // === FUNCIÓN PARA ELIMINAR CÓDIGO INDIVIDUAL ===
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

  // === VERIFICACIÓN DE PERMISOS ===
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

  // === PREPARACIÓN DE DATOS ===
  let locationText = "Esperando ubicación..."
  if (errorMsg) {
    locationText = errorMsg
  } else if (location) {
    locationText = `Lat: ${location.coords.latitude.toFixed(4)}, Long: ${location.coords.longitude.toFixed(4)}`
  }

  // === COMPONENTE PARA ITEMS DE LA LISTA ===
  const ScannedItem = ({ item }: { item: ScannedCode }) => {
    const onCopyPress = () => {
      Clipboard.setStringAsync(item.data)
      Alert.alert("Copiado", "Texto copiado al portapapeles")
    }

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>QR Scanner {isLocalMode ? "(Modo Local)" : ""}</Text>
        <Text style={styles.subtitle}>{locationText}</Text>

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Total: {stats.total}</Text>
          {stats.ultimoEscaneo && (
            <Text style={styles.statsText}>Último: {new Date(stats.ultimoEscaneo).toLocaleTimeString()}</Text>
          )}
        </View>

        {/* Indicador de estado de escaneo */}
        <View style={styles.statusContainer}>
          <View
            style={[styles.statusIndicator, { backgroundColor: isProcessingRef.current ? "#f39c12" : "#27ae60" }]}
          />
          <Text style={styles.statusText}>{isProcessingRef.current ? "Procesando..." : "Listo para escanear"}</Text>
        </View>
      </View>

      {/* Cámara */}
      <CameraView
        facing={facing}
        style={styles.cameraView}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "datamatrix", "aztec"],
        }}
        onBarcodeScanned={onBarcodeScanned}
      >
        {/* Overlay de escaneo */}
        <View style={styles.scanFrame}>
          <View style={styles.scanCorner} />
        </View>

        {/* Indicador de procesamiento */}
        {isProcessingRef.current && (
          <View style={styles.scanOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.scanText}>Procesando código...</Text>
          </View>
        )}
      </CameraView>

      {/* Botones */}
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

        <TouchableOpacity style={styles.button} onPress={() => setFacing(facing === "back" ? "front" : "back")}>
          <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Voltear</Text>
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

      {/* Lista de códigos */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Códigos Escaneados ({stats.total})</Text>

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
            <Text style={styles.emptySubtext}>Apunta la cámara hacia un código QR o código de barras</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
