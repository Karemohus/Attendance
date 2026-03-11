import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { Shift, ShiftWithDepartment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useShifts() {
  return useQuery<ShiftWithDepartment[]>({
    queryKey: [api.shifts.list.path],
  });
}

export function useCreateShift() {
  return useMutation({
    mutationFn: async (shift: any) => {
      const res = await apiRequest(api.shifts.create.method, api.shifts.create.path, shift);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
    },
  });
}

export function useUpdateShift() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest(
        api.shifts.update.method,
        buildUrl(api.shifts.update.path, { id }),
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
    },
  });
}

export function useDeleteShift() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(api.shifts.delete.method, buildUrl(api.shifts.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
    },
  });
}
