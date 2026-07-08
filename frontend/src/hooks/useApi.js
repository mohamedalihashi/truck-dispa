import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useSocket } from "../contexts/SocketContext";
import { useEffect } from "react";

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboardReport() });
}

export function useCargoRequests(params = {}) {
  return useQuery({
    queryKey: ["cargo-requests", params],
    queryFn: () => api.listCargoRequests(params)
  });
}

export function useTrips(params = {}, options = {}) {
  return useQuery({
    queryKey: ["trips", params],
    queryFn: () => api.listTrips(params),
    ...options
  });
}

export function useTrucks(params = {}) {
  return useQuery({
    queryKey: ["trucks", params],
    queryFn: () => api.listTrucks(params)
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.listNotifications()
  });
}

export function useUsers(params = {}, options = {}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => api.listUsers(params),
    ...options
  });
}

export function useDrivers(params = {}) {
  return useUsers({ role: "driver", limit: 100, ...params });
}

export function useCustomers(params = {}, options = {}) {
  const { enabled, ...rest } = params;
  return useUsers(
    { role: "customer", limit: 100, ...rest },
    { enabled, ...options }
  );
}

export function useReports(period = "monthly") {
  return useQuery({
    queryKey: ["reports", period],
    queryFn: async () => {
      const [revenue, performance, shipments] = await Promise.all([
        api.revenueReport(period),
        api.performanceReport(),
        api.shipmentsReport()
      ]);
      return { revenue, performance, shipments };
    }
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => api.listPayments()
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => api.listAuditLogs()
  });
}

export function useRealtimeInvalidation() {
  const qc = useQueryClient();
  const { events } = useSocket();

  useEffect(() => {
    if (!events[0]) return;
    qc.invalidateQueries({ queryKey: ["cargo-requests"] });
    qc.invalidateQueries({ queryKey: ["trips"] });
    qc.invalidateQueries({ queryKey: ["trucks"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  }, [events[0]?.id, qc]);
}

export function useCreateCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.createCargoRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cargo-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useUpdateCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.updateCargoRequest(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cargo-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useUserMutations() {
  const qc = useQueryClient();
  return {
    create: useMutation({
      mutationFn: (payload) => api.createUser(payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] })
    }),
    update: useMutation({
      mutationFn: ({ id, payload }) => api.updateUser(id, payload),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] })
    }),
    remove: useMutation({
      mutationFn: (id) => api.deleteUser(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] })
    })
  };
}

export function useTruckMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trucks"] });
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  return {
    create: useMutation({
      mutationFn: (payload) => api.createTruck(payload),
      onSuccess: invalidate
    }),
    update: useMutation({
      mutationFn: ({ id, payload }) => api.updateTruck(id, payload),
      onSuccess: invalidate
    }),
    remove: useMutation({
      mutationFn: (id) => api.deleteTruck(id),
      onSuccess: invalidate
    })
  };
}

export function useProfileUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.updateProfile(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] })
  });
}

export function usePaymentMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  };
  return {
    update: useMutation({
      mutationFn: ({ id, status }) => api.updatePayment(id, status),
      onSuccess: invalidate
    }),
    create: useMutation({
      mutationFn: (payload) => api.createPayment(payload),
      onSuccess: invalidate
    }),
    remove: useMutation({
      mutationFn: (id) => api.deletePayment(id),
      onSuccess: invalidate
    })
  };
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings()
  });
}

export function useCancelCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.cancelCargoRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cargo-requests"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["trucks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useAssignCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.assignCargoRequest(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cargo-requests"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["trucks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
}

export function useTripActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trips"] });
    qc.invalidateQueries({ queryKey: ["cargo-requests"] });
    qc.invalidateQueries({ queryKey: ["trucks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  return {
    updateStatus: useMutation({
      mutationFn: ({ id, status }) => api.updateTripStatus(id, status),
      onSuccess: invalidate
    }),
    accept: useMutation({
      mutationFn: (id) => api.acceptTrip(id),
      onSuccess: invalidate
    }),
    reject: useMutation({
      mutationFn: (id) => api.rejectTrip(id),
      onSuccess: invalidate
    }),
    shareLocation: useMutation({
      mutationFn: ({ id, lat, lng }) => api.updateTripLocation(id, { lat, lng }),
      onSuccess: invalidate
    })
  };
}
