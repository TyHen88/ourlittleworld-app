import { ReactNode } from "react";
import { redirect } from "next/navigation";

export default function GoalsDisabledLayout({ children }: { children: ReactNode }) {
  void children;
  redirect("/chat");
}
