import { ScannedCode } from "./models";
import axios from "axios";

export async function getAll(): Promise<ScannedCode[]> {
    try {
        const response = await fetch('http://localhost:3000/codigos');;
        const data = await response.json();
        return data as ScannedCode[];
    } catch (error) {
        console.error('Error retrieving resources:', error);
        return [];
    }    
}

export async function getById(id: string): Promise<ScannedCode|null> {
    try {
        const response = await axios.get(`http://localhost:3000/codigos/${id}`);
        return response.data as ScannedCode;
    } catch (error) {
        console.error('Error retrieving resource:', error);
        return null;
    }
}

export async function create(code: ScannedCode){
    
}

export async function deleteById(id: string){
    
}