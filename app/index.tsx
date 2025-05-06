import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';

import * as Location from 'expo-location';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export default () => {
    const [location, setLocation] =useState<Location.LocationObject|null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();



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

    return (
        <View>
            <Text>GPS: {text}</Text>
            <CameraView facing={facing} style={styles.cameraView}>
                
            </CameraView>
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