export enum VolumeOptions {
    None = 'none',
    Lightbulb = 'bulb',
    Fan = 'fan'
}

export enum DeviceEvents {
    DeviceVolumeUpdate = 'DeviceVolumeUpdate',
    SpeechEnhancementUpdate = 'SpeechEnhancementUpdate',
    NightModeUpdate = 'NightModeUpdate',
    AudioSwitched = 'AudioSwitched'
}

export enum ServiceNames {
    VolumeService = 'Volume',
    MuteService = 'Mute',
    SpeechEnhancementService = 'Speech Enhancement',
    NightModeService = 'Night Mode',
    UpButtonService = 'Up Button',
    DownButtonService = 'Down Button',
    AudioSwitchService = 'Audio Switch'
}
