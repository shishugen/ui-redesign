/*
import axios from 'axios';

interface DownloadParams {
  namespace: string;
  podName: string;
  path: string;
  fileName: string;
  onProgress?: (progress: number) => void;
}

export const downloadFile = async ({
  namespace,
  podName,
  path,
  fileName,
  onProgress
}: DownloadParams) => {
  try {
    const response = await axios({
      url: `/api/download`, // 根据实际API路径调整
      method: 'GET',
      params: {
        namespace,
        podName,
        path,
        fileName
      },
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        const loaded = progressEvent.loaded;
        const total = progressEvent.total;
        const percent = Math.floor((loaded * 100) / total);
        if (onProgress) {
          onProgress(percent);
        }
        console.log(`Download progress: ${percent}%`);
      }
    });

    // 创建下载链接
 const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};
*/
