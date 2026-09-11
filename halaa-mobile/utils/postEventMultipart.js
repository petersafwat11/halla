export async function buildPostEventMediaForm(assets, platform, field = 'files') {
  const form = new FormData();
  for (const [index, asset] of assets.entries()) {
    const video = asset.type === 'video' || /video/i.test(asset.mimeType || '');
    const name = asset.fileName || (video ? 'video_' + index + '.mp4' : 'photo_' + index + '.jpg');
    const type = asset.mimeType || (video ? 'video/mp4' : 'image/jpeg');
    if (platform === 'web') {
      let file = asset.file;
      if (!(file instanceof Blob)) {
        const response = await fetch(asset.uri);
        if (!response.ok) throw new Error('MEDIA_READ_FAILED');
        file = await response.blob();
      }
      form.append(field, file, name);
    } else {
      form.append(field, { uri: asset.uri, name, type });
    }
  }
  return form;
}
