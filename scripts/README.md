# 脚本目录

本目录只保留本地辅助脚本。**答案抓取与更新脚本统一位于 `data/update/`**，
由 GitHub Actions 每日定时执行（见 `.github/workflows/update-*.yml`），无需手动运行。

## 脚本清单

| 脚本 | 用途 |
| --- | --- |
| `check_freshness.py` | 答案新鲜度哨兵：检查 7 款游戏是否都有当日（UTC）答案，缺失时退出码 1（CI 告警用） |
| `auto-update.sh` | 本地部署机辅助脚本：拉取远端更新 → 安装依赖 → 重新构建（路径硬编码，仅本机使用） |

## 手动更新某款游戏答案

在仓库根目录运行对应脚本（需要 `.venv` 中的 Python 环境）：

```bash
.venv/bin/python data/update/update_pinpoint.py      # Pinpoint
.venv/bin/python data/update/update_queens.py        # Queens
.venv/bin/python data/update/update_tango.py         # Tango
.venv/bin/python data/update/update_zip.py           # ZIP
.venv/bin/python data/update/update_patches.py       # Patches
.venv/bin/python data/update/update_crossclimb.py    # Crossclimb
.venv/bin/python data/update/update_mini_sudoku.py   # Mini Sudoku
```

每个脚本会：

1. 抓取当日答案（含历史回填）写入 `data/answers/{game}.ts`；
2. 若配置了 `DASHSCOPE_API_KEY`，用 qwen 为线索生成 `clueHint` 解析；
   未配置时自动降级为模板文案，不影响功能；
3. 输出更新摘要。

## 本地校验

```bash
.venv/bin/python scripts/check_freshness.py   # 全部游戏有当日答案 → 退出码 0
```
