import { SonosDeviceManager } from '../helpers/sonosDeviceManager';
import { SonosLogger } from '../helpers/sonosLogger';
import { DeviceEvents } from '../models/enums';
import { AVTransportEvent } from '../models/sonos-types';

export class AudioSwitchService {
    private device: SonosDeviceManager;
    private logger: SonosLogger;

    private tvVolume: number | undefined;
    private musicVolume: number | undefined;

    constructor(sonosDevice: SonosDeviceManager, logger: SonosLogger) {
        this.device = sonosDevice;
        this.logger = logger;

        this.device.on(DeviceEvents.AudioSwitched, (data: AVTransportEvent) => {
            this.logger.logDebug(JSON.stringify(data));

            var currentVolume = this.device.getVolume();

            if (data.CurrentTrackMetaDataParsed.artist) {
                this.tvVolume = currentVolume;
                if (this.musicVolume) this.device.setVolume(this.musicVolume);
            } else {
                this.musicVolume = currentVolume;
                if (this.tvVolume) this.device.setVolume(this.tvVolume);
            }
        });
    }
}
