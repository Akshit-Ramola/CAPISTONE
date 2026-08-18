import { k8sCoreV1Api } from "./config.js";

export async function createPod(sandboxId) {
    const podManifest = {
        metadata: {
            name: `sandbox-pod-${sandboxId}`,
            labels: {
                app: "sandbox",
                sandboxId: sandboxId
            }
        },

        spec: {
            volumes: [
                {
                    name: "workspace-volume",
                    emptyDir: {}
                }
            ],

            // Runs BEFORE the main containers
            initContainers: [
                {
                    name: "init-container",
                    image: "template:v2",
                    imagePullPolicy: "IfNotPresent",

                    command: [
                        "sh",
                        "-c",
                        "cp -r /workspace/. /seed/"
                    ],

                    volumeMounts: [
                        {
                            name: "workspace-volume",
                            mountPath: "/seed"
                        }
                    ]
                }
            ],

            containers: [
                {
                    name: "sandbox-container",
                    image: "template:v2",
                    imagePullPolicy: "IfNotPresent",

                    ports: [
                        {
                            containerPort: 5173,
                            name: "http"
                        }
                    ],

                    resources: {
                        limits: {
                            cpu: "500m",
                            memory: "1Gi"
                        },
                        requests: {
                            cpu: "250m",
                            memory: "500Mi"
                        }
                    },

                    volumeMounts: [
                        {
                            name: "workspace-volume",
                            mountPath: "/workspace"
                        }
                    ]
                },

                {
                    name: "agent-container",
                    image: "agent",
                    imagePullPolicy: "IfNotPresent",

                    ports: [
                        {
                            containerPort: 3000,
                            name: "http"
                        }
                    ],

                    resources: {
                        limits: {
                            cpu: "500m",
                            memory: "1Gi"
                        },
                        requests: {
                            cpu: "250m",
                            memory: "500Mi"
                        }
                    },

                    volumeMounts: [
                        {
                            name: "workspace-volume",
                            mountPath: "/workspace"
                        }
                    ]
                }
            ]
        }
    };

    const response = await k8sCoreV1Api.createNamespacedPod({
        namespace: "default",
        body: podManifest
    });

    return response;
}