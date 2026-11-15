import request from '@/utils/request'

let baseUrl = process.env.NODE_ENV === 'development' ? '/dev-api' : '/prod-api';

const terminalDownloadUrl = baseUrl + '/aigc/terminal/ssh/download';
const terminalUploadUrl = baseUrl + '/aigc/terminal/ssh/upload  ';

export { terminalDownloadUrl, terminalUploadUrl }

export function testConnection(data) {
  return request({
    url: '/aigc/terminal/ssh/test',
    method: 'post',
    params: data,
  })
}


