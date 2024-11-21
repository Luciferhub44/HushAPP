import React from 'react';
import { Box, Label, ImageListItem } from '@admin-bro/design-system';

const ImageList = (props) => {
  const { record } = props;
  const images = record.params.images || [];

  return (
    <Box>
      <Label>Images</Label>
      <Box display="flex" flexWrap="wrap">
        {images.map((image, index) => (
          <ImageListItem 
            key={index}
            src={image}
            width={100}
            height={100}
            style={{ margin: '5px' }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ImageList; 