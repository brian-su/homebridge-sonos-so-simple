import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { SonosLogger } from '../helpers/sonosLogger';
import { DeviceEvents } from '../models/enums';
import { AVTransportEvent, AudioInputModel, DeviceDetails } from '../models/models';

export class AudioSwitchService {
    private device: SonosDeviceManager;
    private logger: SonosLogger;
    private details: DeviceDetails;

    private previousUri: string | undefined;

    constructor(sonosDevice: SonosDeviceManager, deviceDetails: DeviceDetails, logger: SonosLogger) {
        this.details = deviceDetails;
        this.device = sonosDevice;
        this.logger = logger;

        //Unsure about the async/await being needed here
        this.device.on(DeviceEvents.AudioSwitched, async (data) => await this.handleAudioSwitched(data));
    }

    private async handleAudioSwitched(data: AVTransportEvent) {
        if (data.CurrentTrackMetaDataParsed === undefined) return;

        const inputUri = this.parseUri(data.CurrentTrackMetaDataParsed.uri);
        if (inputUri === this.previousUri) return;

        const currentVolume = await this.device.getVolume();

        const currentSettings = this.details.AudioInputVolumes.find((x) => x.InputUri === inputUri);

        this.logger.logDebug(`Current volume ${currentVolume}`);
        this.logger.logDebug(`Current settings ${JSON.stringify(currentSettings)}`);
        this.logger.logDebug(`Current uri ${inputUri}`);
        this.logger.logDebug(`Input details ${JSON.stringify(data)}`);
        this.logger.logDebug(`Input metadata ${JSON.stringify(data.CurrentTrackMetaDataParsed)}`);

        this.saveVolumeForPreviousInput(currentVolume, this.previousUri);

        if (currentSettings) {
            this.device.setVolume(currentSettings.Volume);
        }

        this.previousUri = inputUri;
    }

    private saveVolumeForPreviousInput(volume: number, inputUri: string | undefined) {
        if (inputUri === undefined) return;

        const updatedInputVolume = { InputUri: inputUri, Volume: volume } as AudioInputModel;
        this.details.UpdateAudioVolumes(this.details.UUID, updatedInputVolume, this.details.AudioInputVolumes);

        return;
    }

    private parseUri(uri: string): string {
        var colonIndex = uri.indexOf(':');

        return uri.substring(0, colonIndex);
    }
}
