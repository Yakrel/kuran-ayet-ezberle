import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

const App = require('./App').default;

registerRootComponent(App);

if (Platform.OS !== 'web') {
  const { registerPlaybackService } = require('./src/services/trackPlayer');
  registerPlaybackService(() => require('./src/services/playbackService').playbackService);
}
