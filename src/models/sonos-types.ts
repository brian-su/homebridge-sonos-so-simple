export interface Device {
    host: string;
    port: number;
    options: Options;
    _events: Events;
    _eventsCount: number;
    getAllGroups(): Promise<Group[]>;
}

export interface Events {}

export interface Options {
    endpoints: Endpoints;
    spotify: Spotify;
}

export interface Endpoints {
    transport: string;
    rendering: string;
    device: string;
}

export interface Spotify {
    region: string;
}

export interface Group {
    Coordinator: string;
    ID: string;
    ZoneGroupMember: ZoneGroupMember[];
    Name: string;
    host: string;
    port: number;
    CoordinatorDevice(): Device;
}

export interface ZoneGroupMember {
    UUID: string;
    Location: string;
    ZoneName: string;
    Icon: string;
    Configuration: string;
    SoftwareVersion: string;
    SWGen: string;
    MinCompatibleVersion: string;
    LegacyCompatibleVersion: string;
    BootSeq: string;
    TVConfigurationError: string;
    HdmiCecAvailable: string;
    WirelessMode: string;
    WirelessLeafOnly: string;
    ChannelFreq: string;
    BehindWifiExtender: string;
    WifiEnabled: string;
    EthLink: string;
    Orientation: string;
    RoomCalibrationState: string;
    SecureRegState: string;
    VoiceConfigState: string;
    MicEnabled: string;
    AirPlayEnabled: string;
    IdleState: string;
    MoreInfo: string;
    SSLPort: string;
    HHSSLPort: string;
    Invisible?: string;
    ChannelMapSet?: string;
}

export interface DeviceDescription {
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
    device: Device[];
}

export interface Device {
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
    iconList?: IconList;
    serialNum: string;
    deviceDescription(): Promise<DeviceDescription>;
}

export interface XRhapsodyExtension {
    xmlns: string;
    deviceID: string;
    deviceCapabilities: DeviceCapabilities;
}

export interface DeviceCapabilities {
    interactionPattern: InteractionPattern;
}

export interface InteractionPattern {
    type: string;
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

export interface QqXQPlaySoftwareCapability {
    _: string;
    'xmlns:qq': string;
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

export interface RenderingControl {
    val: string;
    Volume: Loudness[];
    Mute: Loudness[];
    Bass: AudioDelay;
    Treble: AudioDelay;
    Loudness: Loudness;
    OutputFixed: AudioDelay;
    HeadphoneConnected: AudioDelay;
    SpeakerSize: AudioDelay;
    SubGain: AudioDelay;
    SubCrossover: AudioDelay;
    SubPolarity: AudioDelay;
    SubEnabled: AudioDelay;
    DialogLevel: AudioDelay;
    SurroundLevel: AudioDelay;
    MusicSurroundLevel: AudioDelay;
    AudioDelay: AudioDelay;
    AudioDelayLeftRear: AudioDelay;
    AudioDelayRightRear: AudioDelay;
    NightMode: AudioDelay;
    SurroundEnabled: AudioDelay;
    SurroundMode: AudioDelay;
    HeightChannelLevel: AudioDelay;
    SonarEnabled: AudioDelay;
    SonarCalibrationAvailable: AudioDelay;
    PresetNameList: AudioDelay;
}

export interface AudioDelay {
    val: string;
}

export interface Loudness {
    channel: string;
    val: string;
}
