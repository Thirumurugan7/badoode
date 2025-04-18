import Image from "next/image";
import Link from "next/link";
import VanityFinderPage from "./vanity-finder/page";

export default function Home() {
  return (
    <div className="outfit-font">
      <VanityFinderPage />
    </div>
  );
}
