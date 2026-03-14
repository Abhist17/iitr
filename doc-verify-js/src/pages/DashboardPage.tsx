import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { seedApplications, getDocumentsByApplicationId } from "@/data/seed";

const DISTRICTS = ["All", "Lucknow", "Varanasi", "Kanpur", "Agra"];
const STATUSES = ["All", "verified", "flagged", "pending"];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("All");
  const [districtFilter, setDistrictFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return seedApplications.filter(app => {
      if (statusFilter !== "All" && app.status !== statusFilter) return false;
      if (districtFilter !== "All" && app.district !== districtFilter) return false;
      if (search && !app.citizen_name.toLowerCase().includes(search.toLowerCase()) && !app.id.includes(search)) return false;
      return true;
    });
  }, [statusFilter, districtFilter, search]);

  const stats = useMemo(() => ({
    total: seedApplications.length,
    verified: seedApplications.filter(a => a.status === "verified").length,
    flagged: seedApplications.filter(a => a.status === "flagged").length,
    pending: seedApplications.filter(a => a.status === "pending").length,
  }), []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <h1 className="text-2xl font-semibold mb-6">Officer Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={FileText} label="Total Applications" value={stats.total} color="text-primary" />
          <StatCard icon={CheckCircle} label="Verified Today" value={stats.verified} color="text-success" />
          <StatCard icon={AlertTriangle} label="Flagged" value={stats.flagged} color="text-destructive" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} color="text-warning" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d === "All" ? "All Districts" : d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Citizen Name</TableHead>
                  <TableHead className="hidden sm:table-cell">District</TableHead>
                  <TableHead className="hidden md:table-cell">Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(app => {
                  const docs = getDocumentsByApplicationId(app.id);
                  return (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/application/${app.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{app.id.replace("app-", "#")}</TableCell>
                      <TableCell className="font-medium">{app.citizen_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{app.district}</TableCell>
                      <TableCell className="hidden md:table-cell">{docs.length}</TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No applications found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
