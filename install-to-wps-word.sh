#!/bin/bash
# 安装 Claude Writer 插件到 WPS（直接写入 jsaddons 配置）
# Word 插件使用端口 3003/5175，与 Excel (3001/5173) 和 PPT (3002/5174) 完全独立

echo "==================================="
echo " Claude for WPS Writer 插件安装脚本"
echo " 端口: 3003 (proxy) / 5175 (vite)"
echo "==================================="

cd "$(dirname "$0")"

WPS_JSADDONS="$HOME/Library/Containers/com.kingsoft.wpsoffice.mac/Data/.kingsoft/wps/jsaddons"

# 1. 启动代理服务器（仅清理 Word 端口，不影响 Excel/PPT）
echo ""
echo "▶ [1/4] 启动代理服务器 (端口 3003)..."
lsof -ti:3003 | xargs kill -9 2>/dev/null
sleep 1
node proxy-server.js &
PROXY_PID=$!
sleep 2

if curl -s http://127.0.0.1:3003/health > /dev/null 2>&1; then
  echo "   ✅ 代理服务器启动成功"
else
  echo "   ❌ 代理服务器启动失败"
fi

# 2. 启动 Vite 前端（仅清理 Word 端口，不影响 Excel/PPT）
echo "▶ [2/4] 启动前端服务器 (端口 5175)..."
lsof -ti:5175 | xargs kill -9 2>/dev/null
sleep 1
npm run dev &
VITE_PID=$!
sleep 4

if curl -s http://127.0.0.1:5175/ > /dev/null 2>&1; then
  echo "   ✅ 前端服务器启动成功"
else
  echo "   ⚠️  前端服务器可能还在启动中..."
fi

# 3. 写入 WPS jsaddons 配置
echo "▶ [3/4] 注册 Word 插件到 WPS..."

if [ ! -d "$WPS_JSADDONS" ]; then
  echo "   ❌ WPS jsaddons 目录不存在: $WPS_JSADDONS"
  echo "   请先安装并启动过 WPS Office"
  kill $PROXY_PID $VITE_PID 2>/dev/null
  exit 1
fi

PUBLISH_XML="$WPS_JSADDONS/publish.xml"
WORD_ENTRY='<jspluginonline name="claude-wps-word-plugin" type="wps" url="http://127.0.0.1:3003/wps-addon/" debug="" enable="enable_dev" install="null"/>'

if grep -q "claude-wps-word-plugin" "$PUBLISH_XML" 2>/dev/null; then
  echo "   ✅ publish.xml 已包含 Word 插件条目"
else
  sed -i '' "s|</jsplugins>|  $WORD_ENTRY\n</jsplugins>|" "$PUBLISH_XML"
  echo "   ✅ 已添加 Word 插件到 publish.xml"
fi

python3 -c "
import json
path = '$WPS_JSADDONS/authaddin.json'
try:
    with open(path) as f:
        data = json.load(f)
except:
    data = {}
word_id = '776f726450314b495469644978427732'
data['wps'] = {
    word_id: {
        'enable': True,
        'isload': True,
        'md5': '',
        'mode': 2,
        'name': 'claude-wps-word-plugin',
        'path': 'http://127.0.0.1:3003/wps-addon'
    },
    'namelist': word_id
}
with open(path, 'w') as f:
    json.dump(data, f, indent=4)
print('   ✅ 已更新 authaddin.json')
"

# 4. 重启 WPS
echo "▶ [4/4] 重启 WPS Office 以加载新插件..."
osascript -e 'tell application "wpsoffice" to quit' 2>/dev/null || true
sleep 3
open -a "/Applications/wpsoffice.app"

echo ""
echo "==================================="
echo " ✅ Writer 插件安装完成！"
echo ""
echo " 请打开或新建一个文字文档,"
echo " 在顶部工具栏找到 [Claude AI] 按钮。"
echo ""
echo " ※ Excel 插件 (3001/5173) 不受影响"
echo " ※ PPT 插件 (3002/5174) 不受影响"
echo "==================================="
echo ""
echo " 前端地址: http://localhost:5175"
echo " 代理地址: http://localhost:3003"
echo ""
echo " 按 Ctrl+C 停止 Word 插件服务"

trap "kill $PROXY_PID $VITE_PID 2>/dev/null; exit" INT TERM
wait
