import { redirect } from "next/navigation";

export default function NewKitPage() {
  redirect("/kits?new=1");
}
