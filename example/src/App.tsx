import { SafeAreaView, Text } from 'react-native';
import { MediaCropper, TCropResult } from 'react-native-media-editor';

const App = (): JSX.Element => {
  const handleCropAreaChange = (_data: TCropResult) => {
    // @TODO implement
  };

  return (
    <SafeAreaView>
      <Text>hello world</Text>
      <MediaCropper onCropAreaChange={handleCropAreaChange} />
    </SafeAreaView>
  );
};

export default App;
