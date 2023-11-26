export interface XmlDeviceDetailsModel {
    specVersion: SpecVersion;
    device: DeviceDetails;
    _xmlns: string;
}

export interface DeviceDetails {
    deviceType: string;
    friendlyName: string;
    manufacturer: string;
    manufacturerURL: string;
    modelNumber: string;
    modelDescription: string;
    modelName: string;
    modelURL: string;
    softwareVersion: string;
    swGen: string;
    hardwareVersion: string;
    serialNum: string;
    MACAddress: string;
    UDN: string;
    iconList: IconList;
    minCompatibleVersion: string;
    legacyCompatibleVersion: string;
    apiVersion: string;
    minApiVersion: string;
    displayVersion: string;
    extraVersion: string;
    nsVersion: string;
    roomName: string;
    displayName: string;
    zoneType: string;
    feature1: string;
    feature2: string;
    feature3: string;
    seriesid: string;
    variant: string;
    internalSpeakerSize: string;
    memory: string;
    flash: string;
    ampOnTime: string;
    retailMode: string;
    SSLPort: string;
    securehhSSLPort: string;
    serviceList: ServiceList;
    deviceList: DeviceList;
}

export interface DeviceList {
    device: DeviceElement[];
}

export interface DeviceElement {
    deviceType: string;
    friendlyName: string;
    manufacturer: string;
    manufacturerURL: string;
    modelNumber: string;
    modelDescription: string;
    modelName: string;
    modelURL: string;
    UDN: string;
    serviceList: ServiceList;
    'X_Rhapsody-Extension'?: XRhapsodyExtension;
    X_QPlay_SoftwareCapability?: XQPlaySoftwareCapability;
    iconList?: IconList;
}

export interface XQPlaySoftwareCapability {
    '_xmlns:qq': string;
    __prefix: string;
    __text: string;
}

export interface XRhapsodyExtension {
    deviceID: string;
    deviceCapabilities: DeviceCapabilities;
    _xmlns: string;
}

export interface DeviceCapabilities {
    interactionPattern: InteractionPattern;
}

export interface InteractionPattern {
    _type: string;
}

export interface IconList {
    icon: Icon;
}

export interface Icon {
    mimetype: string;
    width: string;
    height: string;
    depth: string;
    url: string;
    id?: string;
}

export interface ServiceList {
    service: Service[];
}

export interface Service {
    serviceType: string;
    serviceId: string;
    controlURL: string;
    eventSubURL: string;
    SCPDURL: string;
}

export interface SpecVersion {
    major: string;
    minor: string;
}
