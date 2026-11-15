/**
 * 通用js方法封装处理
 * Copyright (c) 2019
 */

// 日期格式化
export function parseTime(time, pattern) {
  if (arguments.length === 0 || !time) {
    return null
  }
  const format = pattern || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if ((typeof time === 'string') && (/^[0-9]+$/.test(time))) {
      time = parseInt(time)
    } else if (typeof time === 'string') {
      time = time.replace(new RegExp(/-/gm), '/').replace('T', ' ').replace(new RegExp(/\.[\d]{3}/gm), '');
    }
    if ((typeof time === 'number') && (time.toString().length === 10)) {
      time = time * 1000
    }
    date = new Date(time)
  }
  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  }
  const time_str = format.replace(/{(y|m|d|h|i|s|a)+}/g, (result, key) => {
    let value = formatObj[key]
    // Note: getDay() returns 0 on Sunday
    if (key === 'a') { return ['日', '一', '二', '三', '四', '五', '六'][value] }
    if (result.length > 0 && value < 10) {
      value = '0' + value
    }
    return value || 0
  })
  return time_str
}

// 表单重置
export function resetForm(refName) {
  if (this.$refs[refName]) {
    this.$refs[refName].resetFields();
  }
}

// 添加日期范围
export function addDateRange(params, dateRange, propName) {
  let search = params;
  search.params = typeof (search.params) === 'object' && search.params !== null && !Array.isArray(search.params) ? search.params : {};
  dateRange = Array.isArray(dateRange) ? dateRange : [];
  if (typeof (propName) === 'undefined') {
    search.params['beginTime'] = dateRange[0];
    search.params['endTime'] = dateRange[1];
  } else {
    search.params['begin' + propName] = dateRange[0];
    search.params['end' + propName] = dateRange[1];
  }
  return search;
}

// 回显数据字典
export function selectDictLabel(datas, value) {
  if (value === undefined) {
    return "";
  }
  var actions = [];
  Object.keys(datas).some((key) => {
    if (datas[key].value == ('' + value)) {
      actions.push(datas[key].label);
      return true;
    }
  })
  if (actions.length === 0) {
    actions.push(value);
  }
  return actions.join('');
}

// 回显数据字典（字符串、数组）
export function selectDictLabels(datas, value, separator) {
  if (value === undefined || value.length ===0) {
    return "";
  }
  if (Array.isArray(value)) {
    value = value.join(",");
  }
  var actions = [];
  var currentSeparator = undefined === separator ? "," : separator;
  var temp = value.split(currentSeparator);
  Object.keys(value.split(currentSeparator)).some((val) => {
    var match = false;
    Object.keys(datas).some((key) => {
      if (datas[key].value == ('' + temp[val])) {
        actions.push(datas[key].label + currentSeparator);
        match = true;
      }
    })
    if (!match) {
      actions.push(temp[val] + currentSeparator);
    }
  })
  return actions.join('').substring(0, actions.join('').length - 1);
}

// 字符串格式化(%s )
export function sprintf(str) {
  var args = arguments, flag = true, i = 1;
  str = str.replace(/%s/g, function () {
    var arg = args[i++];
    if (typeof arg === 'undefined') {
      flag = false;
      return '';
    }
    return arg;
  });
  return flag ? str : '';
}

// 转换字符串，undefined,null等转化为""
export function parseStrEmpty(str) {
  if (!str || str == "undefined" || str == "null") {
    return "";
  }
  return str;
}

// 数据合并
export function mergeRecursive(source, target) {
  for (var p in target) {
    try {
      if (target[p].constructor == Object) {
        source[p] = mergeRecursive(source[p], target[p]);
      } else {
        source[p] = target[p];
      }
    } catch (e) {
      source[p] = target[p];
    }
  }
  return source;
};

/**
 * 构造树型结构数据
 * @param {*} data 数据源
 * @param {*} id id字段 默认 'id'
 * @param {*} parentId 父节点字段 默认 'parentId'
 * @param {*} children 孩子节点字段 默认 'children'
 */
export function handleTree(data, id, parentId, children) {
  let config = {
    id: id || 'id',
    parentId: parentId || 'parentId',
    childrenList: children || 'children'
  };

  var childrenListMap = {};
  var tree = [];
  for (let d of data) {
    let id = d[config.id];
    childrenListMap[id] = d;
    if (!d[config.childrenList]) {
      d[config.childrenList] = [];
    }
  }

  for (let d of data) {
    let parentId = d[config.parentId]
    let parentObj = childrenListMap[parentId]
    if (!parentObj) {
      tree.push(d);
    } else {
      parentObj[config.childrenList].push(d)
    }
  }
  return tree;
}

/**
* 参数处理
* @param {*} params  参数
*/
export function tansParams(params) {
  let result = ''
  for (const propName of Object.keys(params)) {
    const value = params[propName];
    var part = encodeURIComponent(propName) + "=";
    if (value !== null && value !== "" && typeof (value) !== "undefined") {
      if (typeof value === 'object') {
        for (const key of Object.keys(value)) {
          if (value[key] !== null && value[key] !== "" && typeof (value[key]) !== 'undefined') {
            let params = propName + '[' + key + ']';
            var subPart = encodeURIComponent(params) + "=";
            result += subPart + encodeURIComponent(value[key]) + "&";
          }
        }
      } else {
        result += part + encodeURIComponent(value) + "&";
      }
    }
  }
  return result
}

// 返回项目路径
export function getNormalPath(p) {
  if (p.length === 0 || !p || p == 'undefined') {
    return p
  };
  let res = p.replace('//', '/')
  if (res[res.length - 1] === '/') {
    return res.slice(0, res.length - 1)
  }
  return res
}

// 验证是否为blob格式
export function blobValidate(data) {
  return data.type !== 'application/json'
}


export function formatDuration(second) {
  let duration="00:00:00";
  if(second >0){
    let timeH= Math.floor(second / 60 / 60 % 24);
    let timeM= Math.floor(second/ 60 % 60);
    let timeS= Math.floor(second % 60);
    timeH=timeH > 9 ? timeH : '0' + timeH;
    timeM=timeM > 9 ? timeM : '0' + timeM;
    timeS=timeS > 9 ? timeS : '0' + timeS;
    duration=timeH+":"+timeM+":"+timeS
  }
  return duration;
}

export function formatDurationHour(second) {
  let duration="";
  if(second >0){
    let timeH = Math.floor(second / 60 / 60);
    let timeM = Math.floor(second / 60 % 60);

    if (timeH > 0) {
      duration += timeH + '小时';
    }
    if (timeM > 0) {
      duration += timeM + '分钟';
    }
  }else{
    duration="0分钟"
  }
  return duration;
}

export function formatFileSize(fileSize) {
  let size=0 +" B";
  if(fileSize > 1024 * 1024 * 1024){
    size= (fileSize / 1024 /1024 /1024).toFixed(2) +" GB";
  }else  if(fileSize > 1024 * 1024){
    size= (fileSize / 1024 /1024).toFixed(2) +" MB";
  }else  if(fileSize > 1024){
    size= (fileSize / 1024).toFixed(2) +" KB";
  }
  return size;
}

//生成随机符串
export function generateRandomStr(strLength) {
  let randomStr='';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < strLength; i++) {
    randomStr += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return randomStr;
}

// 字符串截取
export function toSubString(str,limit) {
  let value=str;
  if (!value) return "";
  value=value.replace(/<[^>]*>/g,'');
  if (value.length > limit) {
    return value.slice(0, limit) + "......";
  }
  return value;
}

/***
 *解码
 * @param val
 * @returns {string}
 */
import { Base64 } from 'js-base64';
export function decodeToString(encodeVal) {
  let decode='';
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8');
    const bytes = encoder.encode(encodeVal)
    for(var i=0;i<bytes.length;i++){
      bytes[i] -=1
    }
    decode = Base64.decode(decoder.decode(bytes))
  } catch (e) {
  }
  return decode;
}
//格式化日期和时段
export function formatDateAndTime(beginTime, endTime) {
  try {
    if(beginTime != '' && endTime != ''){
      // 拆分 [日期, 时间]
      const [startDate, startTime] = beginTime.split(' ')
      const [endDate, endTimeStr] = endTime.split(' ')
      if (startDate == endDate) {
        // 同一天，省略结束的日期
        return `${startDate} ${startTime} ~ ${endTimeStr}`
      } else {
        // 不同天，完整展示
        return `${beginTime} ~ ${endTime}`
      }
    }
  } catch (e) {

  }
  return `${beginTime} ~ ${endTime}`
}

// 格式化时间段
export function formatTimePeriod(startTime,endTime) {
  let time = '0分钟'
  let timeD = 0;
  let timeH = 0;
  let timeM = 0;
  let times = 0;
  if (startTime && endTime) {
    try {
      var nowTime = new Date(startTime);
      var endDateTime = new Date(endTime)
      var startNum = nowTime.getTime();
      var endNum = endDateTime.getTime();
      var second = (endNum - startNum) / 1000;//时间差（秒）
      timeD = Math.floor(second / 60 / 60 / 24);
      timeH = Math.floor(second / 60 / 60 % 24);
      timeM = Math.floor(second / 60 % 60);
      times = Math.floor(second % 60);
      time = ''
      if (timeD > 0) {
        time += timeD + '天';
      }
      if (timeH > 0) {
        time += timeH + '小时';
      }
      if (timeM > 0) {
        time += timeM + '分钟';
      }
      if (time == '') {
        time += times + '秒';
      }
    }catch (e) {

    }
  }
  return time;
}



//html转markdown
export function htmlToMarkdown(html){
// 创建临时DOM容器
  const container = document.createElement('div');
  container.innerHTML = html;

  // 转换函数
  const convertNode = (node) => {
    // 处理文本节点
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim()
          ? node.textContent.replace(/\n/g, '  \n') // 处理换行
          : '';
    }

    // 处理元素节点
    const tag = node.tagName.toLowerCase();
    let markdown = '';

    switch (tag) {
      case 'h1':
        markdown = '# ' + convertChildren(node) + '\n\n';
        break;
      case 'h2':
        markdown = '## ' + convertChildren(node) + '\n\n';
        break;
      case 'h3':
        markdown = '### ' + convertChildren(node) + '\n\n';
        break;
      case 'h4':
        markdown = '#### ' + convertChildren(node) + '\n\n';
        break;
      case 'h5':
        markdown = '##### ' + convertChildren(node) + '\n\n';
        break;
      case 'h6':
        markdown = '###### ' + convertChildren(node) + '\n\n';
        break;

      case 'p':
        markdown = convertChildren(node) + '\n\n';
        break;
      case 'br':
        markdown = '  \n';
        break;

      case 'strong':
      case 'b':
        markdown = '**' + convertChildren(node) + '**';
        break;
      case 'em':
      case 'i':
        markdown = '*' + convertChildren(node) + '*';
        break;
      case 'del':
        markdown = '~~' + convertChildren(node) + '~~';
        break;

      case 'a':
        const href = node.getAttribute('href') || '';
        markdown = href
            ? '[' + convertChildren(node) + '](' + href + ')'
            : convertChildren(node);
        break;

      case 'img':
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || '';
        markdown = src ? `![${alt}](${src})` : '';
        break;

      case 'ul':
        markdown = convertChildren(node)
            .split('\n')
            .filter(line => line.startsWith('* '))
            .join('\n') + '\n';
        break;

      case 'ol':
        let index = 1;
        markdown = convertChildren(node)
            .split('\n')
            .filter(line => line.startsWith('1. '))
            .map(() => `${index++}. `)
            .join('\n') + '\n';
        break;

      case 'li':
        const bullet = node.parentNode.tagName === 'OL'
            ? '1. '
            : '* ';
        markdown = bullet + convertChildren(node).trim() + '\n';
        break;

      case 'code':
        markdown = '`' + (node.textContent || '') + '`';
        break;

      case 'pre':
        if (node.firstElementChild?.tagName === 'CODE') {
          markdown = '```' + node.textContent + '```\n';
        }
        break;

      case 'blockquote':
        markdown = convertChildren(node)
            .split('\n')
            .map(line => '> ' + line)
            .join('\n') + '\n';
        break;

      default:
        markdown = convertChildren(node);
    }

    return markdown;
  };

  // 递归处理子节点
  const convertChildren = (node) => {
    return Array.from(node.childNodes)
        .map(convertNode)
        .filter(text => text !== '')
        .join('');
  };

  // 开始转换
  return convertChildren(container).trim();
}


//加密数据
export function encryptParams(data){
  try {
    // 对象转JSON字符串
    const json = JSON.stringify(data)
    // utf8编码为Uint8Array
    const uint8Arr = new TextEncoder().encode(json)
    // 字节数组转二进制字符串，再btoa加密
    const binaryStr = Array.from(uint8Arr, byte => String.fromCharCode(byte)).join('')
    return btoa(binaryStr)
  } catch (err) {
    console.error('加密失败：', err)
    return ''
  }
}
//解密数据
export function decryptParams(base64Str){
  if (!base64Str) return ''
  try {
    // base64解码成二进制字符串
    const binaryStr = atob(base64Str)
    // 二进制字符串转回Uint8数组
    const uint8Arr = Uint8Array.from([...binaryStr].map(char => char.charCodeAt(0)))
    // utf8解码为正常json字符串
    const json = new TextDecoder().decode(uint8Arr)
    // 解析成对象
    return JSON.parse(json)
  } catch (err) {
    console.error('解密失败：', err)
    return ''
  }
}
