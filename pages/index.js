import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("nfe_user") : null;
    router.replace(raw ? "/app" : "/login");
  }, [router]);
  return null;
}
