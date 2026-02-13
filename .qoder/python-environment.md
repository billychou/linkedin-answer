# Python 环境配置

## 虚拟环境路径

项目的 Python 虚拟环境路径为：**`.venv`**（相对于项目主路径）

### 使用说明

- 虚拟环境位于项目根目录下的 `.venv` 文件夹中
- 在执行 Python 相关任务时，应优先使用 `.venv/bin/python` 或激活虚拟环境
- 安装 Python 依赖时应在虚拟环境中进行

### 激活虚拟环境

```bash
# macOS/Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### 安装依赖

```bash
# 激活虚拟环境后
pip install -r requirements.txt
```
