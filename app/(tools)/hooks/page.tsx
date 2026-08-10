import { HookLab } from "../../components/HookLab";

export default function HooksPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
          Hook Lab
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Eight opening lines for a topic, one per archetype.
        </p>
      </div>
      <HookLab />
    </div>
  );
}
