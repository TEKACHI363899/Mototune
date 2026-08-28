import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Video, FileText } from 'lucide-react-native';
import { IPost } from '../../interfaces/post';
import { HIGTheme } from '../../constants/theme';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

interface IPostGridItemProps {
  post: IPost;
  onPress: (post: IPost) => void;
}

const PostGridItem = memo(({ post, onPress }: IPostGridItemProps) => {
  const theme = 'dark';
  const colors = HIGTheme[theme];

  return (
    <TouchableOpacity
      style={[styles.cell, { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE }]}
      onPress={() => onPress(post)}
      activeOpacity={0.8}
    >
      {post.mediaUrl ? (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: post.mediaUrl }} style={styles.image} resizeMode="cover" />
          {post.mediaType === 'video' && (
            <View style={styles.videoBadge}>
              <Video size={14} color="#FFFFFF" />
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.textCell, { backgroundColor: '#1C1C1E' }]}>
          <FileText size={18} color="#8E8E93" style={styles.iconMargin} />
          <Text style={[styles.captionPreview, { color: colors.label }]} numberOfLines={3}>
            {post.content || 'Bài viết'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cell: {
    margin: 0.6,
    backgroundColor: '#141416',
    overflow: 'hidden',
  },
  mediaContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 3,
  },
  textCell: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconMargin: {
    marginBottom: 4,
  },
  captionPreview: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});

export default PostGridItem;
