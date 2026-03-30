import { registerRootComponent } from 'expo';

import App from './App';
import { playbackService } from './src/services/playbackService';
import { registerPlaybackService } from './src/services/trackPlayer';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerPlaybackService(playbackService);
registerRootComponent(App);
