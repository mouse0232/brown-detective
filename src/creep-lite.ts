import getOfflineAudioContext from './audio'
import getCanvas2d from './canvas'
import getCanvasWebgl from './webgl'
import getConsoleErrors from './engine'
import getFonts from './fonts'
import getMaths from './math'
import getNavigator from './navigator'
import getScreen from './screen'
import getTimezone from './timezone'
import getClientRects from './domrect'
import getHeadlessFeatures from './headless'
import getCSSMedia from './cssmedia'
import getMedia from './media'
import { getLies } from './lies'
import { hashify } from './utils/crypto'
import { IS_BLINK, braveBrowser, getBraveMode } from './utils/helpers'
import { timer } from './errors'

// 轻量版指纹采集 - 只包含 12 个高价值检测维度
// 预计采集时间：100-300ms
const fingerprintLite = async (options = {}) => {
	const {
		apiEndpoint = null,        // 自动 POST 的目标 URL
		cacheEnabled = true,       // 启用 localStorage 缓存
		cacheTTL = 1800000,        // 缓存时间 30 分钟
		sendToAPI = false,         // 是否自动发送到 API
	} = options

	const timeStart = timer()

	// 检查缓存
	const cacheKey = 'creepjs_lite_fingerprint'
	if (cacheEnabled) {
		try {
			const cached = localStorage.getItem(cacheKey)
			if (cached) {
				const { timestamp, fingerprint } = JSON.parse(cached)
				if (Date.now() - timestamp < cacheTTL) {
					console.log('[CreepJS Lite] Fingerprint loaded from cache')
					if (sendToAPI && apiEndpoint) {
						await sendFingerprintToAPI(fingerprint, apiEndpoint)
					}
					return fingerprint
				}
			}
		} catch (e) {
			// localStorage 不可用或解析失败，继续采集
		}
	}

	// 并行采集核心特征
	const [
		canvasWebglComputed,
		canvas2dComputed,
		screenComputed,
		mathsComputed,
		consoleErrorsComputed,
		timezoneComputed,
		clientRectsComputed,
		fontsComputed,
		offlineAudioContextComputed,
		cssMediaComputed,
		mediaComputed,
	] = await Promise.all([
		getCanvasWebgl(),
		getCanvas2d(),
		getScreen(),
		getMaths(),
		getConsoleErrors(),
		getTimezone(),
		getClientRects(),
		getFonts(),
		getOfflineAudioContext(),
		getCSSMedia(),
		getMedia(),
	]).catch((error) => {
		console.error('[CreepJS Lite]采集错误:', error.message)
		return []
	})

	const navigatorComputed = await getNavigator()
		.catch((error) => console.error('[CreepJS Lite] Navigator 采集错误:', error.message))

	const isBrave = IS_BLINK ? await braveBrowser() : false
	const braveMode = isBrave ? getBraveMode() : {}

	const headlessComputed = await getHeadlessFeatures({
		webgl: canvasWebglComputed,
	}).catch((error) => console.error('[CreepJS Lite] 无头检测错误:', error.message))

	const liesComputed = getLies()  // getLies 是同步函数，不需要 await

	// 生成哈希
	const [
		canvasWebglHash,
		canvas2dHash,
		screenHash,
		mathsHash,
		consoleErrorsHash,
		timezoneHash,
		rectsHash,
		fontsHash,
		audioHash,
		navigatorHash,
		headlessHash,
		liesHash,
		cssMediaHash,
		mediaHash,
	] = await Promise.all([
		hashify(canvasWebglComputed),
		hashify(canvas2dComputed),
		hashify(screenComputed),
		hashify((mathsComputed || {}).data),
		hashify((consoleErrorsComputed || {}).errors),
		hashify(timezoneComputed),
		hashify(clientRectsComputed),
		hashify(fontsComputed),
		hashify(offlineAudioContextComputed),
		hashify(navigatorComputed),
		hashify(headlessComputed),
		hashify(liesComputed),
		hashify(cssMediaComputed),
		hashify(mediaComputed),
	]).catch((error) => console.error('[CreepJS Lite] 哈希生成错误:', error.message))

	const fingerprintTimeEnd = timeStart()
	console.log(`[CreepJS Lite] Fingerprinting complete in ${(fingerprintTimeEnd).toFixed(2)}ms`)

	// 构建指纹对象
	const fingerprint = {
		version: 'lite',
		timestamp: Date.now(),
		collectionTime: fingerprintTimeEnd,
		navigator: !navigatorComputed ? undefined : { ...navigatorComputed, $hash: navigatorHash },
		screen: !screenComputed ? undefined : { ...screenComputed, $hash: screenHash },
		canvas2d: !canvas2dComputed ? undefined : { ...canvas2dComputed, $hash: canvas2dHash },
		canvasWebgl: !canvasWebglComputed ? undefined : { ...canvasWebglComputed, $hash: canvasWebglHash },
		timezone: !timezoneComputed ? undefined : { ...timezoneComputed, $hash: timezoneHash },
		clientRects: !clientRectsComputed ? undefined : { ...clientRectsComputed, $hash: rectsHash },
		fonts: !fontsComputed ? undefined : { ...fontsComputed, $hash: fontsHash },
		offlineAudioContext: !offlineAudioContextComputed ? undefined : { ...offlineAudioContextComputed, $hash: audioHash },
		maths: !mathsComputed ? undefined : { ...mathsComputed, $hash: mathsHash },
		consoleErrors: !consoleErrorsComputed ? undefined : { ...consoleErrorsComputed, $hash: consoleErrorsHash },
		headless: !headlessComputed ? undefined : { ...headlessComputed, $hash: headlessHash },
		lies: !liesComputed ? undefined : { ...liesComputed, $hash: liesHash },
	}

	// 构建稳定版指纹对象（完全模仿官方 creep 对象结构）
	const stableFingerprint: any = {
		// 1. navigator
		navigator: navigatorComputed ? {
			bluetoothAvailability: navigatorComputed.bluetoothAvailability,
			device: navigatorComputed.device,
			deviceMemory: navigatorComputed.deviceMemory,
			hardwareConcurrency: navigatorComputed.hardwareConcurrency,
			maxTouchPoints: navigatorComputed.maxTouchPoints,
			oscpu: navigatorComputed.oscpu,
			platform: navigatorComputed.platform,
			system: navigatorComputed.system,
			userAgentData: navigatorComputed.userAgentData ? {
				...navigatorComputed.userAgentData,
				brandsVersion: undefined,
				uaFullVersion: undefined,
			} : undefined,
			vendor: navigatorComputed.vendor,
		} : undefined,
		
		// 2. screen
		screen: screenComputed ? {
			height: screenComputed.height,
			width: screenComputed.width,
			pixelDepth: screenComputed.pixelDepth,
			colorDepth: screenComputed.colorDepth,
		} : undefined,
		
		// 3. workerScope - 排除！因为 Worker 脚本路径不同导致数据不一致
		// workerScope: ... (故意排除)
		
		// 4. media
		media: mediaComputed,
		
		// 5. canvas2d
		canvas2d: canvas2dComputed ? {
			lied: canvas2dComputed.lied,
			dataURI: canvas2dComputed.dataURI,
			paintURI: canvas2dComputed.paintURI,
			textURI: canvas2dComputed.textURI,
			emojiURI: canvas2dComputed.emojiURI,
			textMetricsSystemSum: canvas2dComputed.textMetricsSystemSum,
			emojiSet: canvas2dComputed.emojiSet,
		} : undefined,
		
		// 6. canvasWebgl
		canvasWebgl: canvasWebglComputed ? {
			...canvasWebglComputed,
			parameters: canvasWebglComputed.parameters,
		} : undefined,
		
		// 7. cssMedia
		cssMedia: cssMediaComputed ? {
			reducedMotion: cssMediaComputed.mediaCSS?.['prefers-reduced-motion'],
			colorScheme: cssMediaComputed.mediaCSS?.['prefers-color-scheme'],
			monochrome: cssMediaComputed.mediaCSS?.monochrome,
			invertedColors: cssMediaComputed.mediaCSS?.['inverted-colors'],
			forcedColors: cssMediaComputed.mediaCSS?.['forced-colors'],
			anyHover: cssMediaComputed.mediaCSS?.['any-hover'],
			hover: cssMediaComputed.mediaCSS?.hover,
			anyPointer: cssMediaComputed.mediaCSS?.['any-pointer'],
			pointer: cssMediaComputed.mediaCSS?.pointer,
			colorGamut: cssMediaComputed.mediaCSS?.['color-gamut'],
		} : undefined,
		
		// 8. css
		css: undefined, // 需要额外的 CSS 采集，先排除
		
		// 9. timezone
		timezone: timezoneComputed ? {
			locationMeasured: timezoneComputed.locationMeasured,
			lied: timezoneComputed.lied,
		} : undefined,
		
		// 10. offlineAudioContext
		offlineAudioContext: offlineAudioContextComputed && !offlineAudioContextComputed.lied ? offlineAudioContextComputed : undefined,
		
		// 11. fonts
		fonts: fontsComputed && !fontsComputed.lied ? fontsComputed.fontFaceLoadFonts : undefined,
		
		// 12. forceRenew（固定时间戳）
		forceRenew: 1737085481442,
	}
	
	// 生成 creepHash（完全模仿官方）
	const creepHash = await hashify(stableFingerprint)
	fingerprint.creepHash = creepHash
	fingerprint.fingerprintId = creepHash

	// 保存到缓存
	if (cacheEnabled) {
		try {
			localStorage.setItem(cacheKey, JSON.stringify({
				timestamp: Date.now(),
				fingerprint,
			}))
		} catch (e) {
			// localStorage 不可用，忽略
		}
	}

	// 自动发送到 API
	if (sendToAPI && apiEndpoint) {
		await sendFingerprintToAPI(fingerprint, apiEndpoint)
	}

	return fingerprint
}

// 发送指纹到 API
const sendFingerprintToAPI = async (fingerprint, endpoint) => {
	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fingerprint }),
		})
		const result = await response.json()
		console.log('[CreepJS Lite] API Response:', result)
		return result
	} catch (error) {
		console.error('[CreepJS Lite] API 发送失败:', error.message)
		return null
	}
}

// 导出
export default fingerprintLite

// 全局暴露
if (typeof window !== 'undefined') {
	window.CreepLite = fingerprintLite
	window.Creep = fingerprintLite  // 向后兼容
}
