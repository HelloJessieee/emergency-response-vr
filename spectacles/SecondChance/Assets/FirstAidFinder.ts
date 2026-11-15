/**
 * SECOND CHANCE / equipment finder prototype for Spectacles 2024 (Gen 5).
 *
 * The mock result never identifies a real object. In normal mode the Lens
 * sends a JPEG to the project's bounded /api/lens/find gateway; the OpenAI
 * key stays on that server. A result is a possible visual match, not proof.
 *
 * Camera and depth are paired by exposure timestamp. DepthModule is an
 * Experimental API; enable it and the Camera/Microphone permissions in Lens
 * Studio. A real network gateway also needs the appropriate internet and
 * sensitive-data permissions. See Snap's Depth Module and Transparent
 * Permission documentation before distributing a Lens.
 */

type VisionResult = { found: boolean; coordinates?: [number, number] };
type ColorSample = { texture: Texture; timestamp: number };
type FrozenPair = {
  color: ColorSample;
  depth: Float32Array;
  depthCamera: DeviceCamera;
  worldFromDevice: mat4;
  timestamp: number;
  receivedAt: number;
};

@component
export class FirstAidFinder extends BaseScriptComponent {
  @input marker: SceneObject;
  @input cameraModule: CameraModule;
  @input gatewayBaseUrl: string = 'http://127.0.0.1:4173';
  @input mockVisionForTraining: boolean = false;
  @input maxPairAgeSeconds: number = 0.5;
  @input maxFrameDeltaSeconds: number = 0.07;

  private depthModule: DepthModule | null = null;
  private internetModule: InternetModule | null = null;
  private cameraTexture: Texture | null = null;
  private colorCamera: DeviceCamera | null = null;
  private depthSession: DepthFrameSession | null = null;
  private colorRegistration: EventRegistration | null = null;
  private depthRegistration: EventRegistration | null = null;
  private colorHistory: ColorSample[] = [];
  private latestPair: FrozenPair | null = null;
  private cachedPair: FrozenPair | null = null;
  private busy = false;
  private destroyed = false;
  private requestSerial = 0;
  private markerLabel: Text | null = null;
  private loggedColor = false;
  private loggedDepth = false;
  private loggedPair = false;

  onAwake(): void {
    if (!this.marker) {
      // The integrated scene uses this world-root fallback. A separately
      // authored marker can still be assigned through the Inspector.
      this.marker = global.scene.createSceneObject('SC Possible Equipment Marker');
    }
    if (this.marker) {
      const label = this.marker.createComponent('Component.Text');
      this.markerLabel = label;
      label.text = '( + )';
      label.size = 52;
      label.depthTest = false;
      label.textFill.color = new vec4(0.30, 1, 0.82, 1);
      label.backgroundSettings.enabled = false;
      this.marker.enabled = false;
    }
    (global as any).secondChanceFindEquipment = (item: string) => {
      void this.findItem(item);
    };
    (global as any).secondChanceClearEquipment = () => {
      this.requestSerial++;
      if (this.marker) this.marker.enabled = false;
      this.cachedPair = null;
      this.busy = false;
    };
    this.createEvent('OnStartEvent').bind(() => this.start());
    this.createEvent('OnDestroyEvent').bind(() => this.cleanup());
    this.createEvent('UpdateEvent').bind(() => {
      if (this.marker && this.marker.enabled) {
        const camera = global.scene.getRootObject(0);
        if (camera) this.marker.getTransform().setWorldRotation(
          camera.getTransform().getWorldRotation()
        );
      }
    });
  }

  private start(): void {
    if (!this.marker) {
      print('[FirstAidFinder] Assign a world-space marker SceneObject.');
      return;
    }
    if (global.deviceInfoSystem.isEditor()) {
      this.setStatus('Device camera/depth required; test on Spectacles.');
      return;
    }
    try {
      if (!this.cameraModule) throw new Error('Camera Module asset not assigned');
      // Gen 5 depth is aligned to the left color camera. Do not silently
      // substitute Default_Color on newer Specs, where it may mean right.
      const request = CameraModule.createCameraRequest();
      request.cameraId = CameraModule.CameraId.Left_Color;
      request.imageSmallerDimension = 756;
      this.cameraTexture = this.cameraModule.requestCamera(request);
      this.colorCamera = global.deviceInfoSystem.getTrackingCameraForId(
        CameraModule.CameraId.Left_Color
      );
      const provider = this.cameraTexture.control as CameraTextureProvider;
      this.colorRegistration = provider.onNewFrame.add((frame: CameraFrame) => {
        if (!this.cameraTexture || this.destroyed) return;
        if (!this.loggedColor) {
          this.loggedColor = true;
          print('[FirstAidFinder] Color camera frames received');
        }
        // copyFrame freezes RGB pixels; the live Texture changes every frame.
        this.colorHistory.push({
          texture: this.cameraTexture.copyFrame(),
          timestamp: frame.timestampSeconds
        });
        if (this.colorHistory.length > 8) this.colorHistory.shift();
      });
    } catch (error) {
      this.setStatus('Camera unavailable. Check camera permission.');
      print('[FirstAidFinder] Camera start failed: ' + error);
      return;
    }

    try {
      this.depthModule = require('LensStudio:DepthModule');
      // A DepthFrameSession streams depth; saveDepthFrame below is our cache
      // operation, as in Snap's Depth Cache sample, not a DepthModule method.
      this.depthSession = this.depthModule!.createDepthFrameSession();
      this.depthRegistration = this.depthSession.onNewFrame.add(
        (frame: DepthFrameData) => this.onDepthFrame(frame)
      );
      this.depthSession.start();
      print('[FirstAidFinder] Camera and depth sessions started');
    } catch (error) {
      this.setStatus('Depth unavailable. Enable Experimental APIs.');
      print('[FirstAidFinder] Depth start failed: ' + error);
      return;
    }

    // SecondChanceDisplay owns the only ASR session and forwards finalized
    // "Find the ..." commands. Starting another session cancels the first.
    try { this.internetModule = require('LensStudio:InternetModule'); }
    catch (error) { print('[FirstAidFinder] Internet unavailable: ' + error); }
  }

  private onDepthFrame(frame: DepthFrameData): void {
    if (!this.loggedDepth) {
      this.loggedDepth = true;
      print('[FirstAidFinder] Depth frames received');
    }
    if (!this.colorHistory.length || this.destroyed) return;
    let closest = this.colorHistory[0];
    for (const color of this.colorHistory) {
      if (Math.abs(color.timestamp - frame.timestampSeconds) <
          Math.abs(closest.timestamp - frame.timestampSeconds)) closest = color;
    }
    const delta = Math.abs(closest.timestamp - frame.timestampSeconds);
    // Reject a loose pair. A stale RGB frame would put the arrow on the wrong
    // object after the wearer moves their head.
    if (delta > this.maxFrameDeltaSeconds) return;
    const pose = frame.toWorldTrackingOriginFromDeviceRef;
    this.latestPair = {
      color: closest,
      depth: frame.depthFrame.slice(),
      depthCamera: frame.deviceCamera,
      worldFromDevice: mat4.fromColumns(
        pose.column0, pose.column1, pose.column2, pose.column3
      ),
      timestamp: frame.timestampSeconds,
      // Camera/depth timestamps describe capture, while getTime() is the
      // Lens clock. Use one clock for freshness instead of subtracting them.
      receivedAt: getTime()
    };
    if (!this.loggedPair) {
      this.loggedPair = true;
      print('[FirstAidFinder] Synchronized color/depth pair ready');
    }
  }

  private saveDepthFrame(): FrozenPair | null {
    const pair = this.latestPair;
    if (!pair || getTime() - pair.receivedAt > this.maxPairAgeSeconds) return null;
    this.cachedPair = pair;
    return pair;
  }

  private async findItem(item: string): Promise<void> {
    if (this.busy || this.destroyed) return;
    const names: {[key: string]: string} = {
      tourniquet: 'tourniquet', gauze: 'gauze',
      epinephrine: 'epinephrine', 'epinephrine auto injector': 'epinephrine auto-injector',
      'epinephrine auto-injector': 'epinephrine auto-injector',
      'aed trainer': 'aed trainer'
    };
    item = names[item] || '';
    if (!item) {
      this.setStatus('Supported: tourniquet, gauze, epinephrine, AED trainer.');
      return;
    }
    const pair = this.saveDepthFrame();
    if (!pair || !this.colorCamera) {
      this.setStatus('Camera/depth not ready. Please try again.');
      return;
    }
    this.busy = true;
    const serial = ++this.requestSerial;
    this.marker.enabled = false;
    this.setStatus('Searching training view for ' + item + '...');
    try {
      const imageBase64 = await this.encodeJpeg(pair.color.texture);
      if (this.destroyed || serial !== this.requestSerial) return;
      const prompt = 'Locate the ' + item +
        ' in this medical kit. Return JSON: {"found": boolean, ' +
        '"coordinates": [x, y]}. Coordinates are image pixels, origin ' +
        'at the upper left. If uncertain, return found:false.';
      const result = await this.fetchVisionLLM(
        imageBase64, prompt, item, pair.color.texture.getWidth(),
        pair.color.texture.getHeight()
      );
      if (this.destroyed || serial !== this.requestSerial) return;
      if (!result.found || !result.coordinates) {
        this.setStatus('Item not located. Ask the dispatcher or another person.');
        return;
      }
      const world = this.pixelToWorld(pair, result.coordinates);
      if (!world) {
        this.setStatus('Object depth uncertain. Try another view.');
        return;
      }
      this.marker.getTransform().setWorldPosition(world);
      if (this.markerLabel)
        this.markerLabel.text = item.toUpperCase().slice(0, 16) + '  +';
      this.marker.enabled = true;
      this.setStatus(this.mockVisionForTraining
        ? 'SIMULATED marker for ' + item + ' — verify visually.'
        : 'Possible ' + item + ' — verify visually.');
      print('[FirstAidFinder] Marker placed at ' + world.toString());
    } catch (error) {
      this.marker.enabled = false;
      this.setStatus('Image analysis unavailable.');
      print('[FirstAidFinder] Search failed: ' + error);
    } finally {
      // Drop every retained reference to this capture. The camera/depth ring
      // continues, but the frozen request pair must not survive model latency.
      if (serial === this.requestSerial) {
        if (this.latestPair === pair) this.latestPair = null;
        this.cachedPair = null;
        this.busy = false;
      }
    }
  }

  private encodeJpeg(texture: Texture): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      Base64.encodeTextureAsync(
        texture, resolve, () => reject(new Error('JPEG encoding failed')),
        CompressionQuality.IntermediateQuality, EncodingType.Jpg
      );
    });
  }

  /**
   * The explicit training mock returns the center pixel without inspecting
   * the image. Normal mode sends a bounded request to our own gateway. The
   * gateway keeps the OpenAI key secret and validates item and coordinates.
   */
  private async fetchVisionLLM(
    imageBase64: string, prompt: string, item: string,
    width: number, height: number
  ): Promise<VisionResult> {
    if (!imageBase64 || !prompt) return { found: false };
    if (this.mockVisionForTraining) {
      print('[FirstAidFinder] SIMULATED center pixel; no object recognition.');
      return Promise.resolve({ found: true, coordinates: [width / 2, height / 2] });
    }
    if (!this.gatewayBaseUrl || !this.internetModule)
      throw new Error('Gateway unavailable');
    const url = this.gatewayBaseUrl.replace(/\/$/, '') + '/api/lens/find';
    const response = await this.internetModule.fetch(new Request(url, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({image: 'data:image/jpeg;base64,' + imageBase64,
        item, width, height})
    }));
    if (response.status !== 200) throw new Error('Gateway HTTP ' + response.status);
    const result = await response.json() as VisionResult;
    if (!result || result.found !== true || !Array.isArray(result.coordinates) ||
        result.coordinates.length !== 2) return { found: false };
    const x = result.coordinates[0], y = result.coordinates[1];
    if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0 || x >= width || y >= height)
      return { found: false };
    return { found: true, coordinates: [x, y] };
  }

  private pixelToWorld(pair: FrozenPair, pixel: [number, number]): vec3 | null {
    const width = pair.color.texture.getWidth();
    const height = pair.color.texture.getHeight();
    const x = pixel[0], y = pixel[1];
    if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0 || x >= width || y >= height)
      return null;

    // 1. The model reports pixels in the frozen RGB image. Convert to [0,1]
    // using that image's dimensions, not the display or depth resolution.
    const colorUv = new vec2(x / width, y / height);
    // 2. Both DeviceCamera methods operate in device reference space. Cast a
    // ray through the RGB pixel at any positive depth (100 cm here), then
    // project that point through the DEPTH camera. This accounts for camera
    // intrinsics, crop, and the left/depth camera offset.
    const rayPoint = this.colorCamera!.unproject(colorUv, 100);
    const depthUv = pair.depthCamera.project(rayPoint);
    if (!isFinite(depthUv.x) || !isFinite(depthUv.y) || depthUv.x < 0 ||
        depthUv.y < 0 || depthUv.x >= 1 || depthUv.y >= 1) return null;
    const dw = Math.floor(pair.depthCamera.resolution.x);
    const dh = Math.floor(pair.depthCamera.resolution.y);
    const dx = Math.floor(depthUv.x * dw);
    const dy = Math.floor(depthUv.y * dh);
    // 3. A 3x3 median reduces isolated invalid or noisy depth pixels.
    const valid: number[] = [];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const sx = dx + ox, sy = dy + oy;
      if (sx < 0 || sy < 0 || sx >= dw || sy >= dh) continue;
      const depthCm = pair.depth[sx + sy * dw];
      if (isFinite(depthCm) && depthCm > 10 && depthCm < 450)
        valid.push(depthCm);
    }
    if (valid.length < 3) return null;
    valid.sort((a, b) => a - b);
    const depthCm = valid[Math.floor(valid.length / 2)];
    // 4. Unproject the depth pixel using its measured centimeter distance;
    // then apply the POSE CAPTURED WITH THAT DEPTH FRAME. Applying the current
    // head pose would make the marker shift when the model answer is delayed.
    const devicePoint = pair.depthCamera.unproject(depthUv, depthCm);
    const world = pair.worldFromDevice.multiplyPoint(devicePoint);
    return isFinite(world.x) && isFinite(world.y) && isFinite(world.z)
      ? world : null;
  }

  private setStatus(message: string): void {
    const callback = (global as any).secondChanceVisionStatus;
    if (typeof callback === 'function') callback(message);
    print('[FirstAidFinder] ' + message);
  }

  private cleanup(): void {
    this.destroyed = true;
    this.requestSerial++;
    if (this.marker) this.marker.enabled = false;
    if ((global as any).secondChanceFindEquipment)
      (global as any).secondChanceFindEquipment = null;
    if ((global as any).secondChanceClearEquipment)
      (global as any).secondChanceClearEquipment = null;
    if (this.depthSession) {
      if (this.depthRegistration)
        this.depthSession.onNewFrame.remove(this.depthRegistration);
      this.depthSession.stop();
    }
    if (this.cameraTexture && this.colorRegistration)
      (this.cameraTexture.control as CameraTextureProvider)
        .onNewFrame.remove(this.colorRegistration);
    this.colorHistory = [];
    this.latestPair = null;
    this.cachedPair = null;
  }
}
