"use client";

/**
 * نمایشگر مدل سه‌بعدی واقعی محصول (فایل GLB/GLTF بارگذاری‌شده توسط مدیر).
 * فقط وقتی مدل وجود دارد بارگذاری می‌شود؛ در غیر این صورت هیچ مدل عمومی جایگزین «لباس» نمی‌شود.
 */
import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function ModelViewer({ url, label }: { url: string; label: string }) {
  return (
    <div className="arch-3-4 relative aspect-[3/4] overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#fffaf3,#ead7c3)]" role="img" aria-label={label}>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.4, 3], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 3]} intensity={1.6} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#e9a0b0" />
        <React.Suspense fallback={null}>
          <Bounds fit clip observe margin={1.15}>
            <Center>
              <Model url={url} />
            </Center>
          </Bounds>
        </React.Suspense>
        <OrbitControls makeDefault enablePan={false} enableDamping minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.7} />
      </Canvas>
      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-ink-muted">برای چرخاندن بکشید؛ برای بزرگ‌نمایی از دو انگشت یا چرخ موس استفاده کنید.</p>
    </div>
  );
}
