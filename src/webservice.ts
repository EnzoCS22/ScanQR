
import axios from "axios";
import { ScannedCode } from "./models";

const hostApi = 'http://192.168.1.4:3000';

export async function getAll(): Promise<ScannedCode[]> {
    try {
        const response = await fetch(`${hostApi}/codigos`);;
        const data = await response.json();
        return data as ScannedCode[];
    } catch (error) {
        console.error('Error retrieving resources:', error);
        return [];
    }    
}

export async function getById(id: string): Promise<ScannedCode|null> {
    try {
        const response = await axios.get(`${hostApi}/codigos/${id}`);
        if (response.status === 400) {
            console.error(response.data);
            return null;
        }
        return response.data as ScannedCode;
    } catch (error) {
        console.error('Error retrieving resource:', error);
        return null;
    }
}

export async function create(code: ScannedCode){
    try {
        const response = await axios.post(`${hostApi}/codigos`, code, {
            headers: {
                'Content-Type': 'application/json',
                mode: 'cors'
            }
        });
        console.log(response);
        if (response.status >= 500){
            console.error('Server error:', response.data);
        }
    } catch (error) {
        console.error('Error creating resource:', error);
        return null;    
    }
}

export async function deleteById(id: string){
    try {
        const response = await axios.delete(`${hostApi}/codigos/${id}`);
        if (response.status === 400) {
            console.error(response.data);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error retrieving resource:', error);
        return false;
    }
}