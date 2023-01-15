import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { SonosLogger } from '../helpers/sonosLogger';
import { DeviceEvents } from '../models/enums';
import { AudioInputModel } from '../models/models';
import { AVTransportEvent } from '../models/sonos-types';

export class AudioSwitchService {
    private device: SonosDeviceManager;
    private logger: SonosLogger;

    private inputTypes: AudioInputModel[] = [];
    private previousUri: string | undefined;

    constructor(sonosDevice: SonosDeviceManager, logger: SonosLogger) {
        this.device = sonosDevice;
        this.logger = logger;

        this.device.on(DeviceEvents.AudioSwitched, (data: AVTransportEvent) => {
            if (data.CurrentTrackMetaDataParsed === undefined) return;

            const currentVolume = this.device.getVolume();
            const inputUri = data.CurrentTrackMetaDataParsed.uri;
            const currentSettings = this.inputTypes.find((x) => x.InputUri === inputUri);

            this.logger.logDebug(`Input details ${JSON.stringify(data)}`);
            this.logger.logDebug(`Input metadata ${JSON.stringify(data.CurrentTrackMetaDataParsed)}`);
            this.logger.logInfo(`Current Input Uri: ${data.CurrentTrackMetaDataParsed.uri}`);

            this.saveVolumeForPreviousInput(currentVolume);

            if (currentSettings) {
                this.device.setVolume(currentSettings.Volume);
            } else {
                this.inputTypes.push({ InputUri: inputUri, Volume: currentVolume });
            }

            this.previousUri = inputUri;
        });
    }

    private saveVolumeForPreviousInput(volume: number) {
        if (this.previousUri === undefined) return;

        const inputIndex = this.inputTypes.findIndex((x) => x.InputUri === this.previousUri);
        const updatedInputVolume = { InputUri: this.previousUri, Volume: volume } as AudioInputModel;

        if (inputIndex === -1) {
            this.inputTypes.push(updatedInputVolume);
        } else {
            this.inputTypes[inputIndex] = updatedInputVolume;
        }
    }
}
