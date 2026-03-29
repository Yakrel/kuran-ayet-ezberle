import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import { playbackService } from './src/services/playbackService';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
TrackPlayer.registerPlaybackService(() => playbackService);
registerRootComponent(App);
