# 素材替換接口
詳見 ART_SPEC.md（規範）與 ASSET_STATUS.md（狀態）。
- 圖片載入：js/assets.js 讀取 assets/manifest.json；有圖用圖，無圖退回程式佔位。
- 替換：放入 PNG → 改 manifest（status:final）→ 重新整理。
- 舊接口 SE.ART.external['bld:<type>:<lv>'] 仍可用。
