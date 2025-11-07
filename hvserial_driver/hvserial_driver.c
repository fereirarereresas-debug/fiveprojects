/*
 * hvserial_driver.c
 * 
 * Driver de Virtualização de Porta Serial para Hyper-V
 * Arquivo principal do driver
 * 
 * Este driver atua como intermediário entre o sistema operacional host
 * e as portas seriais físicas, permitindo que máquinas virtuais acessem
 * portas seriais físicas como se fossem locais.
 * 
 * Copyright (c) 2024 Five Projects
 */

#include "hvserial_driver.h"

#ifdef ALLOC_PRAGMA
#pragma alloc_text (INIT, DriverEntry)
#pragma alloc_text (PAGE, HvSerialEvtDeviceAdd)
#pragma alloc_text (PAGE, HvSerialEvtDriverContextCleanup)
#pragma alloc_text (PAGE, HvSerialCreateDevice)
#endif

/*
 * DriverEntry
 * 
 * Ponto de entrada do driver. Inicializa o driver e registra callbacks.
 * 
 * Parâmetros:
 *   DriverObject - Objeto do driver fornecido pelo sistema
 *   RegistryPath - Caminho do registro do driver
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
DriverEntry(
    _In_ PDRIVER_OBJECT  DriverObject,
    _In_ PUNICODE_STRING RegistryPath
)
{
    WDF_DRIVER_CONFIG config;
    NTSTATUS status;
    WDF_OBJECT_ATTRIBUTES attributes;

    //
    // Registrar informações de rastreamento ETW
    //
    KdPrint(("HvSerial: DriverEntry - Iniciando driver de porta serial Hyper-V v%d.%d.%d\n",
             HVSERIAL_MAJOR_VERSION,
             HVSERIAL_MINOR_VERSION,
             HVSERIAL_BUILD_NUMBER));

    //
    // Inicializar configuração do driver WDF
    //
    WDF_DRIVER_CONFIG_INIT(&config, HvSerialEvtDeviceAdd);

    //
    // Definir callback de limpeza do driver
    //
    WDF_OBJECT_ATTRIBUTES_INIT(&attributes);
    attributes.EvtCleanupCallback = HvSerialEvtDriverContextCleanup;

    //
    // Criar objeto do driver WDF
    //
    status = WdfDriverCreate(DriverObject,
                            RegistryPath,
                            &attributes,
                            &config,
                            WDF_NO_HANDLE);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: DriverEntry - Falha ao criar driver WDF, status=0x%x\n", status));
        return status;
    }

    KdPrint(("HvSerial: DriverEntry - Driver inicializado com sucesso\n"));

    return status;
}

/*
 * HvSerialEvtDeviceAdd
 * 
 * Callback chamado quando um novo dispositivo é adicionado ao sistema.
 * Cria e inicializa o objeto de dispositivo.
 * 
 * Parâmetros:
 *   Driver - Handle do driver
 *   DeviceInit - Estrutura de inicialização do dispositivo
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialEvtDeviceAdd(
    _In_    WDFDRIVER       Driver,
    _Inout_ PWDFDEVICE_INIT DeviceInit
)
{
    NTSTATUS status;

    UNREFERENCED_PARAMETER(Driver);

    PAGED_CODE();

    KdPrint(("HvSerial: HvSerialEvtDeviceAdd - Adicionando novo dispositivo\n"));

    //
    // Criar o dispositivo
    //
    status = HvSerialCreateDevice(DeviceInit);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialEvtDeviceAdd - Falha ao criar dispositivo, status=0x%x\n", status));
    }

    return status;
}

/*
 * HvSerialCreateDevice
 * 
 * Cria e inicializa um objeto de dispositivo serial virtual.
 * 
 * Parâmetros:
 *   DeviceInit - Estrutura de inicialização do dispositivo
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialCreateDevice(
    _Inout_ PWDFDEVICE_INIT DeviceInit
)
{
    WDF_OBJECT_ATTRIBUTES deviceAttributes;
    PDEVICE_CONTEXT deviceContext;
    WDFDEVICE device;
    NTSTATUS status;
    WDF_IO_QUEUE_CONFIG queueConfig;
    WDFQUEUE queue;

    PAGED_CODE();

    //
    // Definir propriedades do dispositivo
    //
    WdfDeviceInitSetDeviceType(DeviceInit, FILE_DEVICE_SERIAL_PORT);
    WdfDeviceInitSetExclusive(DeviceInit, FALSE);

    //
    // Configurar atributos do contexto do dispositivo
    //
    WDF_OBJECT_ATTRIBUTES_INIT_CONTEXT_TYPE(&deviceAttributes, DEVICE_CONTEXT);

    //
    // Criar o objeto do dispositivo
    //
    status = WdfDeviceCreate(&DeviceInit, &deviceAttributes, &device);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialCreateDevice - Falha ao criar dispositivo, status=0x%x\n", status));
        return status;
    }

    //
    // Obter ponteiro para o contexto do dispositivo
    //
    deviceContext = GetDeviceContext(device);

    //
    // Inicializar contexto do dispositivo
    //
    deviceContext->Device = device;
    deviceContext->PortNumber = 0; // Será definido durante a configuração
    deviceContext->IsBound = FALSE;
    deviceContext->PhysicalPort = NULL;

    //
    // Inicializar configuração padrão da porta serial
    //
    deviceContext->Config.BaudRate = 9600;
    deviceContext->Config.DataBits = 8;
    deviceContext->Config.Parity = 0;    // Sem paridade
    deviceContext->Config.StopBits = 0;  // 1 bit de parada
    deviceContext->Config.FlowControl = 0; // Sem controle de fluxo

    //
    // Zerar estatísticas
    //
    RtlZeroMemory(&deviceContext->Statistics, sizeof(SERIAL_PORT_STATISTICS));

    //
    // Inicializar spinlock do dispositivo
    //
    KeInitializeSpinLock(&deviceContext->DeviceLock);

    //
    // Inicializar eventos
    //
    KeInitializeEvent(&deviceContext->ReadEvent, SynchronizationEvent, FALSE);
    KeInitializeEvent(&deviceContext->WriteEvent, SynchronizationEvent, FALSE);

    //
    // Inicializar buffers de transmissão e recepção
    //
    status = HvSerialInitializeBuffer(&deviceContext->ReceiveBuffer, HVSERIAL_BUFFER_SIZE);
    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialCreateDevice - Falha ao inicializar buffer de recepção, status=0x%x\n", status));
        return status;
    }

    status = HvSerialInitializeBuffer(&deviceContext->TransmitBuffer, HVSERIAL_BUFFER_SIZE);
    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialCreateDevice - Falha ao inicializar buffer de transmissão, status=0x%x\n", status));
        HvSerialCleanupBuffer(&deviceContext->ReceiveBuffer);
        return status;
    }

    //
    // Configurar fila de I/O padrão
    //
    WDF_IO_QUEUE_CONFIG_INIT_DEFAULT_QUEUE(&queueConfig, WdfIoQueueDispatchParallel);

    queueConfig.EvtIoRead = HvSerialEvtIoRead;
    queueConfig.EvtIoWrite = HvSerialEvtIoWrite;
    queueConfig.EvtIoDeviceControl = HvSerialEvtIoDeviceControl;

    //
    // Criar fila de I/O
    //
    status = WdfIoQueueCreate(device,
                             &queueConfig,
                             WDF_NO_OBJECT_ATTRIBUTES,
                             &queue);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialCreateDevice - Falha ao criar fila de I/O, status=0x%x\n", status));
        HvSerialCleanupBuffer(&deviceContext->ReceiveBuffer);
        HvSerialCleanupBuffer(&deviceContext->TransmitBuffer);
        return status;
    }

    deviceContext->DefaultQueue = queue;

    //
    // Criar interface de dispositivo
    //
    status = WdfDeviceCreateDeviceInterface(device,
                                           &GUID_DEVINTERFACE_COMPORT,
                                           NULL);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialCreateDevice - Falha ao criar interface de dispositivo, status=0x%x\n", status));
        return status;
    }

    KdPrint(("HvSerial: HvSerialCreateDevice - Dispositivo criado com sucesso\n"));

    return STATUS_SUCCESS;
}

/*
 * HvSerialEvtDriverContextCleanup
 * 
 * Callback de limpeza do contexto do driver.
 * Chamado quando o driver está sendo descarregado.
 * 
 * Parâmetros:
 *   DriverObject - Handle do objeto do driver
 */
VOID
HvSerialEvtDriverContextCleanup(
    _In_ WDFOBJECT DriverObject
)
{
    UNREFERENCED_PARAMETER(DriverObject);

    PAGED_CODE();

    KdPrint(("HvSerial: HvSerialEvtDriverContextCleanup - Limpando contexto do driver\n"));

    //
    // Realizar qualquer limpeza necessária do driver
    // (Recursos serão liberados automaticamente pelo WDF)
    //
}
