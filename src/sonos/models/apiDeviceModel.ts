export interface ApiDeviceModel {
    _objectType: string;
    device: DeviceModel;
    householdId: string;
    locationId: string;
    playerId: string;
    groupId: string;
    websocketUrl: string;
    restUrl: string;
}

export interface DeviceModel {
    _objectType: string;
    ip: string;
    id: string;
    primaryDeviceId: string;
    serialNumber: string;
    model: string;
    modelDisplayName: string;
    color: string;
    capabilities: string[];
    apiVersion: string;
    minApiVersion: string;
    websocketUrl: string;
    softwareVersion: string;
    hwVersion: string;
    swGen: number;
}
