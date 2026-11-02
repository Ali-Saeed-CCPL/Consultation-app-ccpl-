import { Toaster } from "sonner";

/** One sonner <Toaster>, mounted at the root, in the ERP's dark-pill look (`.healthtoast` in index.css). */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "healthtoast",
          success: "healthtoast--success",
          error: "healthtoast--error",
          warning: "healthtoast--warning",
          info: "healthtoast--info",
          closeButton: "healthtoast__close",
          description: "healthtoast__desc",
        },
      }}
    />
  );
}
