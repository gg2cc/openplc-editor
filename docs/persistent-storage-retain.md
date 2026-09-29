# RETAIN 变量保持与持久化存储

本文说明编辑器中的 **Persistent Storage（持久化存储）** 设置如何与 IEC 61131-3 的 `RETAIN` 变量配合，以及 Runtime v4 如何保存和恢复这些变量。

## 先理解两层开关

要让变量重启后恢复，必须同时满足：

1. 程序变量声明为 `RETAIN`（或当前编译器支持的 `PERSISTENT`）。
2. 项目的 **Persistent Storage** 页面启用 **Keep retained variables on the device**，并将项目上传到支持该功能的 Runtime。

编辑器页面配置的是“变量值存在哪里”，不会自动把普通变量改成 `RETAIN`。反过来，只声明 `RETAIN` 而不配置任何存储驱动时，程序仍会运行，但变量每次启动都从初始值开始。

内置文件存储适用于 **OpenPLC Runtime v4.2.0 及更高版本**。更早版本没有内置文件存储；如果设备的 VPP 提供了自己的 retain 驱动，则由该驱动负责存储，编辑器会隐藏内置 Persistent Storage 页面。

## 在编辑器中启用

1. 打开项目工作区中的 **Persistent Storage** 页面。
2. 勾选 **Keep retained variables on the device**。
3. 设置 **File location**，或留空使用 Runtime 默认位置。
4. 设置 **Save every** 的秒数，然后保存项目并上传程序。

这些选项属于项目配置，会随项目保存并随程序上传。它们不是设备上的独立在线开关；上传成功后，Runtime 会在下一次加载 PLC 程序时应用新配置，不需要重启 Runtime 服务。

| 设置 | 说明 |
| --- | --- |
| Keep retained variables on the device | 开启或关闭 Runtime 内置文件存储。默认关闭。 |
| File location | 设备上的绝对文件路径。留空时，由 Runtime 在上传时解析设备默认位置。 |
| Save every | 持久化周期，必须是 **1 到 3600 秒**之间的整数。默认值为 **5 秒**。数值越小，突然断电时可能丢失的最近更新越少，但会增加闪存或 SD 卡写入次数。 |

自定义路径的父目录必须已存在，并且 Runtime 进程有权限在其中创建和替换文件。对于容器部署，应将存储目录放在重启容器后仍保留的数据卷中。编辑器不会替设备创建自定义目录。

默认路径取决于 Runtime 环境：

- 原生 Linux 通常为 `/var/lib/openplc-runtime/retain.bin`。
- Linux 容器通常为 `/var/run/runtime/retain.bin`，该目录预期挂载为持久卷。
- 非 Linux 环境通常为 `/run/runtime/retain.bin`。
- 设置环境变量 `OPENPLC_PERSISTENT_DATA_DIR` 后，默认目录由该变量指定。

## 在 ST 程序中声明变量

把需要跨 PLC 重启保留的变量放入 `VAR RETAIN` 声明块，并为新设备或尚无存档时设置合理的初始值：

```iecst
PROGRAM Main
  VAR RETAIN
    boot_count : DINT := 0;
    last_run_ok : BOOL := FALSE;
  END_VAR

  boot_count := boot_count + 1;
END_PROGRAM
```

Runtime 恢复成功时，存储值会覆盖声明中的初始值；首次运行、存储未启用或存档校验不通过时，变量使用初始值。

`RETAIN` 可用于 `VAR`、`VAR_INPUT`、`VAR_OUTPUT` 和 `VAR_GLOBAL`。它不适用于 `VAR_TEMP`、`VAR_IN_OUT`、`VAR_EXTERNAL`，也不能用于没有实例状态的 `FUNCTION` 或 `METHOD`。普通 `VAR` 默认不保留；`NON_RETAIN` 明确表示不保留。

当前 STruC++ 接受 `PERSISTENT` 并按 `RETAIN` 处理，但**不实现 CODESYS 所说的跨程序下载保持**。因此不要仅凭 `PERSISTENT` 这个名称，假设变量在程序变更或重新下载后仍会沿用。

## Runtime 如何实现

### 1. 编辑器生成上传配置

启用内置存储时，编辑器把设置生成为上传包中的 `retain.conf`，内容是简单的 `key=value` 格式，例如：

```ini
enabled=1
path=/var/lib/openplc-runtime/retain.bin
flush_seconds=5
```

如果 File location 留空，上传中的 `path` 暂时为空。Runtime Web 端会将它解析为设备默认路径，再写入 Runtime 根目录下的 `retain.conf`。启用状态下，上传处理会校验路径为绝对路径、父目录存在且目标不是目录，并校验保存周期在允许范围内；不符合要求时会在上传/构建日志中拒绝该配置。

关闭内置存储，或选择由 VPP 自己管理 retain 的目标时，上传不会携带有效的内置存储配置。Runtime 会移除旧的 `retain.conf`，使内置文件驱动不再接管变量。

### 2. 程序加载时选择存储驱动并恢复

PLC 程序加载时，Runtime 重新读取 `retain.conf`，不需要守护进程重启。Runtime 检查程序是否包含 retain 编解码入口、是否声明了保留变量，以及数据大小是否在 Runtime 支持范围内（最多 64 KiB），随后选择一个存储驱动：

- 若 VPP 提供 retain 驱动，使用该驱动（例如设备专用的 FRAM/NVS）。
- 否则，若配置启用内置存储，使用文件驱动。
- 没有可用驱动时，retain 调用不做存储，变量按初始值启动。

恢复发生在第一个 PLC 扫描周期之前。内置文件包含程序 MD5 标识和 retain 数据；Runtime 还会校验数据格式、校验和及变量布局。存档属于另一个程序、布局不匹配或数据损坏时，Runtime 会拒绝该存档，变量从初始值启动，避免把不相干的数据写入当前程序。

### 3. 扫描期间缓存，按周期原子写盘

运行期间，Runtime 在每个扫描周期取得当前 retain 数据并交给驱动。内置文件驱动只在数据变化时标记为待写；后台线程按 `flush_seconds` 周期提交待写数据，扫描线程不会同步等待磁盘写入。写入通过临时文件、同步文件内容和重命名完成，并同步父目录，降低写到一半或掉电造成文件损坏的风险。

这里的“正常卸载程序”是指 Runtime 有机会完成 PLC 程序清理：例如在编辑器/API 中将 PLC 切换到 STOPPED，或者正常停止 Runtime 服务。对于 systemd 部署，`systemctl stop openplc-runtime.service` 会向服务进程发送 `SIGTERM`；Runtime 的优雅关闭路径会卸载当前 PLC 程序，并执行一次最终提交。若 PLC 程序本来就没有加载，则没有这次程序卸载提交。

最终提交会在扫描线程退出后执行，确保取得一致的变量快照。它不是每次扫描都立即写盘的保证：突然断电、进程崩溃，或被 `SIGKILL` 等无法执行清理的方式终止时，都不会触发卸载阶段的最终提交；这时只能依赖前一次按 `Save every` 周期完成的写盘。因此尚未到达保存周期的最新变化可能丢失。保存周期不是断电保护保证；实际结果还取决于设备文件系统、存储介质和供电情况。

## 重要行为与注意事项

- **首次启动时没有旧值是正常的。** 在第一次周期性提交之前，突然断电后仍会从变量初始值启动。
- **改动程序后可能清除旧存档。** Runtime 将存档与程序 MD5 绑定，程序身份变化时会丢弃旧数据；布局变化或格式校验失败也会让恢复失败。升级程序前应把需要长期保留的业务状态另行备份或迁移。
- **关闭设置不会等同于擦除数据文件。** 关闭后内置驱动停止使用，但已有 `retain.bin` 可能仍在设备上。之后若对同一程序重新启用存储，旧文件仍可能被识别并恢复。需要彻底清除时，应在停机并确认路径后，由设备管理员删除实际存储文件。
- **缩短周期会增加介质写入。** 对 SD 卡或闪存，选择能够接受的掉电数据窗口，不要默认使用最短周期。
- **内置文件存储只适用于 Runtime v4 目标。** 若当前目标由 VPP 管理 retain，应使用厂商驱动的存储配置，不要尝试同时启用两种后端。

## 验证与排查

上传后先检查构建/上传日志是否显示持久化配置已安装。Runtime 日志中可重点查找以下信息：

- `built-in file store enabled`：内置文件驱动已启用，并会显示文件路径和保存周期。
- `stored by`：Runtime 已为当前程序选择存储驱动。
- `restored ... bytes`：已从存档恢复 retain 数据。
- `no storage is configured`：没有可用驱动；检查是否勾选设置、上传是否成功、Runtime 是否至少为 v4.2.0，以及目标是否需要 VPP 驱动。
- `cannot write`、`short write` 或 `cannot publish`：检查路径父目录、Runtime 进程写权限、磁盘空间和存储设备状态。
- `stored values belong to a different program` 或 `layout is from a different program`：存档与当前程序不匹配，变量将按初始值启动。

## 实现位置

- 编辑器设置界面：[persistent-storage/index.tsx](../src/frontend/components/_features/%5Bworkspace%5D/editor/persistent-storage/index.tsx)
- 上传配置生成：[generate-retain-conf.ts](../src/backend/shared/compile/steps/generate-retain-conf.ts)
- Runtime 配置解析和校验：[retain_config.py](../../openplc-runtime/webserver/retain_config.py)
- 上传时安装配置：[plcapp_management.py](../../openplc-runtime/webserver/plcapp_management.py)
- Runtime retain 编排：[plc_retain.cpp](../../openplc-runtime/core/src/plc_app/plc_retain.cpp)
- 内置文件存储：[plc_retain_file_store.cpp](../../openplc-runtime/core/src/plc_app/plc_retain_file_store.cpp)
- STruC++ 声明规则：[IEC_COMPLIANCE.md](../../STruCpp/docs/IEC_COMPLIANCE.md)