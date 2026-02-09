import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    antiSnipeThresholdSeconds: parseInt(process.env.ANTI_SNIPE_THRESHOLD_SECONDS || '10', 10),
    antiSnipeExtensionSeconds: parseInt(process.env.ANTI_SNIPE_EXTENSION_SECONDS || '30', 10),
}));
