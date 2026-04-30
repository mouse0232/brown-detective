// 完整解读配置数据
const INTERPRETATIONS = {
    navigator: {
        name: '浏览器信息',
        icon: '🌐',
        riskLevel: 'low',
        riskScore: 15,
        metrics: {
            userAgent: {
                name: '用户代理 (User Agent)',
                explanation: '告诉网站你使用的浏览器、版本和操作系统。',
                deepDive: 'User Agent 是最基本的浏览器标识，但它可以被轻易伪造。现代网站会结合其他指标验证 UA 的真实性。如果 UA 显示 Chrome 但其他特征像 Firefox，就会被标记为可疑。',
                privacyImpact: '中等 - 单独看不独特，但组合后有价值',
                detection: '所有网站都会读取，无法避免'
            },
            platform: {
                name: '硬件平台',
                explanation: '操作系统类型 (Win/Mac/Linux/Android/iOS)',
                deepDive: 'platform 应该与 userAgent 中的 OS 信息一致。不一致是自动化工具的典型特征（如 Selenium 默认 platform 是 Linux 但 UA 显示 Windows）。',
                privacyImpact: '低 - 信息较泛',
                detection: '基础检测，所有网站都会检查'
            },
            language: {
                name: '语言设置',
                explanation: '浏览器首选语言（如 zh-CN、en-US）',
                deepDive: '语言设置应该与访问者的地理位置和 IP 相匹配。访问中文网站但语言是俄语会很可疑。多语言设置（languages 数组）比单一 language 更难伪造。',
                privacyImpact: '低 - 常见语言组合不独特',
                detection: '基础检测'
            },
            webdriver: {
                name: 'WebDriver 检测',
                explanation: '检测是否使用自动化工具 (Selenium/Puppeteer)',
                deepDive: '这是最重要的反爬虫检测点！正常浏览器这是 undefined 或 false，但 Selenium/Puppeteer/Playwright 会将其设为 true。自动化工具会通过删除这个属性来隐藏，但还有其他检测方法。',
                privacyImpact: '关键 - 为 true 则 100% 被识别为爬虫',
                detection: '所有反爬虫系统都会检查'
            },
            hardwareConcurrency: {
                name: 'CPU 核心数',
                explanation: '逻辑 CPU 核心数量',
                deepDive: '显示你的 CPU 有多少个逻辑核心。这个值应该与设备档次匹配（手机通常 4-8 核，电脑 4-16 核）。异常值（如 1 核或超过 64 核）会被怀疑。',
                privacyImpact: '低 - 常见值不独特',
                detection: '中等 - 部分网站会检查'
            },
            deviceMemory: {
                name: '设备内存',
                explanation: '设备 RAM 大小（GB）',
                deepDive: '这是近似值（2、4、8、16 等档次）。配合其他信息可以判断设备档次。低端设备运行高端操作会被怀疑。',
                privacyImpact: '低 - 信息较泛',
                detection: '低 - 较少网站使用'
            },
            maxTouchPoints: {
                name: '触控点数',
                explanation: '支持的触控点数量',
                deepDive: '触摸屏设备>0，传统电脑=0。如果 UA 显示 iPhone 但 maxTouchPoints=0，就是伪造的。',
                privacyImpact: '低 - 二分类信息',
                detection: '低 - 辅助验证'
            }
        }
    },
    screen: {
        name: '屏幕特征',
        icon: '📱',
        riskLevel: 'high',
        riskScore: 40,
        metrics: {
            width: {
                name: '屏幕宽度',
                explanation: '屏幕水平分辨率（像素）',
                deepDive: '常见值：1920（全高清）、2560（2K）、3840（4K）。单独看不独特，但结合 height、availWidth 等就形成了独特的分辨率组合。',
                privacyImpact: '中等 - 常见分辨率不独特',
                detection: '基础检测'
            },
            height: {
                name: '屏幕高度',
                explanation: '屏幕垂直分辨率（像素）',
                deepDive: 'width × height 组合形成分辨率指纹。1920×1080 是最常见组合（约 20% 用户），但 1536×864 就比较少见（约 2% 用户）。',
                privacyImpact: '中等 - 组合后有价值',
                detection: '基础检测'
            },
            availWidth: {
                name: '可用宽度',
                explanation: '扣除任务栏/dock 后的宽度',
                deepDive: 'availWidth 与 width 的差值揭示了任务栏位置和大小。Windows 默认任务栏在底部，差值通常在 height 上体现。',
                privacyImpact: '中 - 使用习惯特征',
                detection: '中等'
            },
            availHeight: {
                name: '可用高度',
                explanation: '扣除任务栏/dock 后的高度',
                deepDive: '结合其他屏幕尺寸可以判断任务栏设置和窗口管理习惯。',
                privacyImpact: '低 - 使用习惯特征',
                detection: '低'
            },
            colorDepth: {
                name: '色彩深度',
                explanation: '每个像素的颜色位数',
                deepDive: '现代设备基本都是 24 位（1670 万色）。如果是 16 位或 32 位，说明设备较老或特殊配置。',
                privacyImpact: '低 - 大多数相同',
                detection: '低'
            },
            pixelRatio: {
                name: '设备像素比',
                explanation: '物理像素与 CSS 像素的比例',
                deepDive: 'Retina 屏是 2 或 3，普通屏是 1。高端手机通常是 3，MacBook 是 2。这个值可以判断设备档次。',
                privacyImpact: '中等 - 设备特征',
                detection: '中等'
            },
            orientation: {
                name: '屏幕方向',
                explanation: '横屏/竖屏状态',
                deepDive: '手机可以旋转，电脑通常固定。portrait-primary 是竖屏，landscape-primary 是横屏。',
                privacyImpact: '低 - 动态变化',
                detection: '低'
            }
        }
    },
    timezone: {
        name: '时区信息',
        icon: '🌍',
        riskLevel: 'low',
        riskScore: 10,
        metrics: {
            timezone: {
                name: '时区',
                explanation: '地理位置时区（如 Asia/Shanghai）',
                deepDive: '时区应该与 IP 地址的地理位置匹配。IP 在北京但时区是 America/New_York，说明可能在用 VPN 或伪造时区。',
                privacyImpact: '中等 - 地理位置线索',
                detection: '基础检测'
            },
            offset: {
                name: 'UTC 偏移',
                explanation: '与 UTC 时间的分钟差',
                deepDive: '中国是 UTC+8（北京时间），美国东部是 UTC-5（纽约时间）。这个值应该与时区一致，不一致说明在伪造。',
                privacyImpact: '低 - 辅助验证',
                detection: '中等'
            },
            language: {
                name: '区域语言',
                explanation: '时区对应的区域语言',
                deepDive: 'Intl API 返回的语言设置。应该与 navigator.language 一致。',
                privacyImpact: '低 - 辅助验证',
                detection: '低'
            }
        }
    },
    webgl: {
        name: '显卡信息',
        icon: '🎮',
        riskLevel: 'critical',
        riskScore: 80,
        metrics: {
            renderer: {
                name: 'GPU 渲染器',
                explanation: '显卡型号和驱动信息',
                deepDive: '这是最强的指纹特征之一！例如："ANGLE (NVIDIA GeForce RTX 3080 ...)"。全球可能有数千种 GPU+ 驱动 组合，单一组合的出现概率可能低于 0.1%。网站用这个来唯一标识你。',
                privacyImpact: '极高 - 高度唯一',
                detection: '高级检测 - 反爬虫系统必查'
            },
            vendor: {
                name: 'GPU 厂商',
                explanation: '显卡制造商',
                deepDive: 'NVIDIA、AMD、Intel 是主流。NVIDIA 通常用于游戏/高性能场景，Intel 集成显卡用于办公。结合 renderer 可以验证真实性。',
                privacyImpact: '低 - 厂商信息较泛',
                detection: '中等'
            },
            version: {
                name: 'WebGL 版本',
                explanation: 'WebGL 和 OpenGL ES 版本',
                deepDive: '例如："WebGL 1.0 (OpenGL ES 2.0 ...)"。不同浏览器、驱动版本显示不同的字符串。可以判断浏览器类型和驱动版本。',
                privacyImpact: '中等 - 版本特征',
                detection: '中等'
            }
        }
    },
    canvas: {
        name: 'Canvas 指纹',
        icon: '🎨',
        riskLevel: 'critical',
        riskScore: 90,
        metrics: {
            dataURL: {
                name: 'Canvas 图像哈希',
                explanation: '渲染图像的 Base64 编码哈希值',
                deepDive: '这是最稳定、最准确的指纹特征！原理：网站在隐藏的 canvas 上绘制一段文字或图形，然后读取像素数据。由于 GPU 渲染差异、抗锯齿算法、字体渲染等不同，每台设备的结果都有微小但稳定的差异。即使使用 Tor 浏览器或 VM，canvas 指纹仍然唯一。',
                privacyImpact: '极高 - 最 stable 的指纹特征',
                detection: '高级检测 - 难以规避'
            }
        }
    },
    fonts: {
        name: '字体列表',
        icon: '🔤',
        riskLevel: 'medium',
        riskScore: 30,
        metrics: {
            fontFaceLoadFonts: {
                name: '已安装字体',
                explanation: '系统中安装的字体名称列表',
                deepDive: '检测原理：创建一个 span 元素，设置特定字体，测量宽度。如果宽度变化说明字体存在。Windows 默认约 10-20 种字体，Mac 约 200-300 种，Linux 约 50-100 种。设计师/开发者安装了很多字体的话，组合会非常独特。',
                privacyImpact: '中等 - 字体数量正常，但组合仍有一定独特性',
                detection: '中等 - 需要时间检测'
            }
        }
    },
    audio: {
        name: '音频指纹',
        icon: '🔊',
        riskLevel: 'medium',
        riskScore: 30,
        metrics: {
            fingerprint: {
                name: 'AudioContext 哈希',
                explanation: '音频处理栈的特征值',
                deepDive: '原理：创建 OscillatorNode 生成特定频率的音频，通过 DynamicsCompressorNode 处理，然后分析输出。不同浏览器、不同系统的音频处理算法有微小差异（如浮点数精度、压缩算法），这些差异会反映在最终输出中。',
                privacyImpact: '中等 - 稳定性较好',
                detection: '低 - 较少网站使用'
            }
        }
    },
    headless: {
        name: '无头浏览器检测',
        icon: '🤖',
        riskLevel: 'critical',
        riskScore: 100,
        metrics: {
            headless: {
                name: '无头模式',
                explanation: '是否使用无头浏览器',
                deepDive: '无头浏览器 (Headless Chrome) 是没有 GUI 的浏览器，专门用于自动化。检测点包括：window length 应为 0 但实际不是、特定 API 不存在、默认 User-Agent 包含 "Headless"。如果 headless=true，100% 被识别为爬虫。',
                privacyImpact: '关键 - 为 true 则直接封禁',
                detection: '所有网站必查'
            },
            riskLevel: {
                name: '风险等级',
                explanation: '综合评估的风险等级',
                deepDive: '基于多项检测的综合评分。critical 表示有明确的自动化特征如 headless=true、webdriver=true、有 Selenium 痕迹。',
                privacyImpact: '关键 - 决定最终决策',
                detection: '核心指标'
            },
            selenium: {
                name: 'Selenium 检测',
                explanation: '是否检测到 Selenium 特征',
                deepDive: 'Selenium 会留下大量痕迹：__selenium 对象、callSeleniumFunction、特殊的 exception stack、不完整的 navigator 对象等。现代 Selenium 可以删除 webdriver，但很难清除所有痕迹。',
                privacyImpact: '关键 - 为 true 则直接封禁',
                detection: '所有反爬虫系统必查'
            }
        }
    },
    network: {
        name: '网络与 IP 信息',
        icon: '🌐',
        riskLevel: 'medium',
        riskScore: 25,
        metrics: {
            ip: {
                name: 'IP 地址（HTTP 出口）',
                explanation: 'HTTP API 获取的出口 IP 地址（已隐藏后 8 位）',
                deepDive: '这是你的 HTTP 请求出口 IP。如果使用了代理/VPN，这个 IP 是代理服务器的 IP。网站通常用这个 IP 判断你的地理位置。为保护隐私，这里隐藏了后 8 位。',
                privacyImpact: '高 - 直接暴露地理位置',
                detection: '所有网站都会获取'
            },
            ipWebrtc: {
                name: 'IP 地址（WebRTC 真实）',
                explanation: 'WebRTC 获取的真实网络接口 IP（已隐藏后 8 位）',
                deepDive: 'WebRTC 可以直接获取你的网络接口 IP，不受代理/VPN 影响。如果这个 IP 与 HTTP API IP 不一致，说明你在使用代理。',
                privacyImpact: '极高 - 暴露真实 IP',
                detection: '高级检测 - 可以绕过代理检测'
            },
            ipDual: {
                name: 'IP 一致性检测',
                explanation: 'WebRTC IP vs HTTP API IP',
                deepDive: 'WebRTC 获取的是真实网络接口 IP（不受代理影响），HTTP API 获取的是出口 IP（受代理影响）。如果两者不一致，说明你可能在使用代理、VPN 或梯子。这是强代理特征，也是反爬虫系统的重要检测点。',
                privacyImpact: '关键 - 不一致会被识别为使用代理',
                detection: '高级检测 - 反爬虫系统常用'
            },
            country: {
                name: '国家/地区',
                explanation: 'HTTP IP 所属国家',
                deepDive: '基于 HTTP 出口 IP 的地理位置。如果使用代理，这里显示的是代理服务器所在国家。这个信息应该与你设置的语言、时区一致。',
                privacyImpact: '中等 - 国家级位置',
                detection: '基础检测'
            },
            region: {
                name: '省份/州',
                explanation: 'HTTP IP 所属省份或州',
                deepDive: '比国家更精确的地理位置。可以用于判断城市级别的位置。',
                privacyImpact: '中等 - 区域级位置',
                detection: '中等'
            },
            city: {
                name: '城市',
                explanation: 'HTTP IP 所属城市',
                deepDive: '最精确的 IP 地理位置（通常精确到区县级）。结合时区可以验证真实性。',
                privacyImpact: '较高 - 城市级位置',
                detection: '中等'
            },
            isp: {
                name: 'ISP / 运营商',
                explanation: '网络服务提供商',
                deepDive: '显示你的宽带运营商（如电信、联通、移动）。如果 ISP 是云服务商（AWS、Google Cloud），会被高度怀疑是爬虫。',
                privacyImpact: '中等 - 运营商信息',
                detection: '中等 - 用于识别云 IP'
            },
            timezone: {
                name: 'IP 时区',
                explanation: 'HTTP IP 所在时区',
                deepDive: '这个时区应该与浏览器的 Intl 时区一致。如果不匹配（如 IP 在美国但浏览器时区是亚洲/上海），说明可能在用代理或伪造时区。',
                privacyImpact: '中等 - 时区一致性验证',
                detection: '中等 - 常用于一致性检查'
            }
        }
    }
};
