import CustomerApp from "./CustomerApp";

export default async function Page(props) {
  const searchParams = await props.searchParams;
  const table = searchParams?.table || "";
  return <CustomerApp initialTable={table} />;
}
