import { redirect } from "next/navigation";

export default function ScannerRoute() {
  redirect("/dashboard?tab=scanner");
}
