"use client";

import dynamic from "next/dynamic";

const JumpBeamApp = dynamic(() => import("./jumpbeam-app"), { ssr: false });

export default function Home() {
  return <JumpBeamApp />;
}
