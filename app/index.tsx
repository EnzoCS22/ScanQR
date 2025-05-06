import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, Alert, FlatList } from 'react-native';

import * as Location from 'expo-location';
import { CameraView, CameraType, useCameraPermissions, BarcodeType, BarcodeScanningResult } from 'expo-camera';

interface ScannedCode {
    code: BarcodeScanningResult;
    location: Location.LocationObject
};


export default () => {
    const [location, setLocation] =useState<Location.LocationObject|null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [ScannedCode, setScannedCode] = useState<ScannedCode[]>([]);

    useEffect(() => {
        async function getCurrentLocation() {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permiso a la ubicacion denegado');
                return;
            }

            let location = await Location.getCurrentPositionAsync();
            setLocation(location);

        }
        getCurrentLocation();
    }, []);

    if(!permission) {
        return <View/>;
    }

    if(!permission.granted) {
        return (
            <View>
                <Text>Sin acceso a la camara</Text>
                <Button title="Solicitar permiso" onPress={requestPermission}/>
            </View>
        );
    }

    let text = 'Cargando...';
    if (errorMsg) {
        text = errorMsg;
    }else if (location) {
        text = JSON.stringify(location);
    }

    const onBarcodeScanned = function (result: BarcodeScanningResult) {
        if (window) {
            window.alert(result.data);
        } else {
            Alert.alert(result.data);
        }
        setScannedCode([{code:result, location:location!}, ...ScannedCode]);
    };

    const ScannedItem = function({item}:{item:ScannedCode}) {
        return (
        <View>
            <Text>{item.code.data}</Text>
            { item.location && (
                <>
                <Text>{item.location.timestamp}</Text>
                <Text>{item.location.coords.latitude}, Long:{item.location.coords.longitude}</Text>
                </>
            )}
        </View>
        );
    }

    return (
        <View>
            <Text>GPS: {text}</Text>
            <CameraView 
                style={styles.cameraView} 
                facing={facing} 
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "code128", "datamatrix", "aztec"]
                }}
                onBarcodeScanned={onBarcodeScanned}
            /> 
            <FlatList 
                data={ScannedCode} 
                keyExtractor={(item) => item.location.timestamp.toFixed(0)} 
                renderItem={ScannedItem}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    cameraView: {
        width: '100%',
        minHeight: 660,
        height: '100%',
    }
});