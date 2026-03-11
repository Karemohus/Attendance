import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useAttendanceLogs() {
  return useQuery({
    queryKey: [api.attendance.list.path],
    queryFn: async () => {
      const res = await fetch(api.attendance.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendance logs");
      return api.attendance.list.responses[200].parse(await res.json());
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.attendance.record.input>) => {
      const validated = api.attendance.record.input.parse(data);
      const res = await fetch(api.attendance.record.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.attendance.record.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        if (res.status === 401) {
          const err = api.attendance.record.responses[401].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to record attendance");
      }
      return api.attendance.record.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
    },
  });
}
