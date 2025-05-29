import { useState, useEffect } from "react";
import { Text, View, StyleSheet, Button, FlatList, TouchableOpacity, Alert } from "react-native";

import * as Location from "expo-location";
import * as Clipboard from "expo-clipboard";
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as Notifications from "expo-notifications";
import { ScannedCode } from "../src/models";
import { getAll, create } from "../src/webservice";

// Configuración del handler de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCodes, setScannedCodes] = useState<ScannedCode[]>([]);

  // useEffect único que maneja permisos y carga inicial
  useEffect(() => {
    const init = async () => {
      try {
        // Permiso de ubicación
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
        } else {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
        }

        // Cargar códigos escaneados desde la API
        const codes = await getAll();
        setScannedCodes(codes);
      } catch (err) {
        console.error("Error durante la inicialización:", err);
      }
    };

    init();
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View>
        <Text>Camera permission is required to use this app.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    alert(result.data);
    await create({ data: result.data, type: result.type });
    const updated = await getAll();
    setScannedCodes(updated);
  };

  const showNotification = async () => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hola',
        body: 'Probando',
      },
      trigger: null,
    });
  };

  const ScannedItem = ({ item }: { item: ScannedCode }) => {
    const onCopyPress = () => {
      Clipboard.setStringAsync(item.data);
    };

    return (
      <View>
        <Text>{item.data}</Text>
        <TouchableOpacity onPress={onCopyPress}>
          <Text>Copiar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const locationText = errorMsg
    ? errorMsg
    : location
    ? JSON.stringify(location)
    : "Waiting...";

  return (
    <View>
      <Button title="Mostrar notificación" onPress={showNotification} />
      <Text>GPS: {locationText}</Text>
      <CameraView
        facing={facing}
        style={styles.CameraView}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'datamatrix', 'aztec'],
        }}
        onBarcodeScanned={onBarcodeScanned}
      />
      <FlatList
        data={scannedCodes}
        keyExtractor={(item) => item.id || ""}
        renderItem={ScannedItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  CameraView: {
    width: "100%",
    minHeight: 240,
  },
});
