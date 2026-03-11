import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { Department } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: [api.departments.list.path],
  });
}

export function useCreateDepartment() {
  return useMutation({
    mutationFn: async (department: any) => {
      const res = await apiRequest(api.departments.create.method, api.departments.create.path, department);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.departments.list.path] });
    },
  });
}

export function useUpdateDepartment() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest(
        api.departments.update.method,
        buildUrl(api.departments.update.path, { id }),
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.departments.list.path] });
    },
  });
}

export function useDeleteDepartment() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(api.departments.delete.method, buildUrl(api.departments.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.departments.list.path] });
    },
  });
}
