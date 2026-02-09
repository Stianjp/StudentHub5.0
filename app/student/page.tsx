import { redirect } from "next/navigation";

export default async function StudentProfilePage() {
  redirect("/student/dashboard");
}
