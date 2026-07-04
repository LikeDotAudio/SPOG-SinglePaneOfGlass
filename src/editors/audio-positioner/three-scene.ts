import * as THREE from 'three';

export interface SpatialState {
  format: string; // '9.1.4' | '5.1.2' | '5.1' | 'stereo'
  faders: { id: string; x: number; y: number; z: number; color: string; label: string; visible: boolean; }[];
}

export class SpatialScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private faderMeshes: Map<string, THREE.Mesh> = new Map();
  private formatGroup: THREE.Group = new THREE.Group();

  constructor(private container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x181818);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    this.camera.position.set(200, 150, 250);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Grid helper
    const gridHelper = new THREE.GridHelper(300, 10, 0x444444, 0x222222);
    gridHelper.position.y = -50;
    this.scene.add(gridHelper);

    // Listener (head/torso placeholder)
    const headGeo = new THREE.SphereGeometry(15, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true });
    const head = new THREE.Mesh(headGeo, headMat);
    this.scene.add(head);

    this.scene.add(this.formatGroup);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(100, 200, 50);
    this.scene.add(dir);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public render(state: SpatialState) {
    // Update format speakers if changed (simplified)
    this.formatGroup.clear();
    const speakerGeo = new THREE.BoxGeometry(10, 15, 10);
    const speakerMat = new THREE.MeshLambertMaterial({ color: 0x888888, transparent: true, opacity: 0.5 });
    
    // Add dummy speakers just to show bounds
    const bounds = 120;
    const poses: [number, number][] = [[-bounds, bounds], [bounds, bounds], [-bounds, -bounds], [bounds, -bounds]];
    for (const [x, z] of poses) {
      const spk = new THREE.Mesh(speakerGeo, speakerMat);
      spk.position.set(x, 50, z); // Heights
      this.formatGroup.add(spk);
    }

    // Update Faders
    for (const f of state.faders) {
      if (!f.visible) {
        if (this.faderMeshes.has(f.id)) {
          this.faderMeshes.get(f.id)!.visible = false;
        }
        continue;
      }
      
      let mesh = this.faderMeshes.get(f.id);
      if (!mesh) {
        const geo = new THREE.SphereGeometry(10, 16, 16);
        const mat = new THREE.MeshLambertMaterial({ color: f.color });
        mesh = new THREE.Mesh(geo, mat);
        this.faderMeshes.set(f.id, mesh);
        this.scene.add(mesh);
      }
      
      mesh.visible = true;
      // Map x, y (from polar azimuth/depth) and z (height) to 3D coords
      mesh.position.set(f.x, f.z, f.y);
      // Update color in case it changed
      (mesh.material as THREE.MeshLambertMaterial).color.setStyle(f.color);
    }
    
    // Hide removed faders
    for (const [id, mesh] of this.faderMeshes.entries()) {
      if (!state.faders.find(f => f.id === id)) mesh.visible = false;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
