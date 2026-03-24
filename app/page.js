import dynamic from "next/dynamic";

const HotSeats = dynamic(() => import("../components/HotSeats"), { ssr: false });

export default function Page() {
  return <HotSeats />;
  }