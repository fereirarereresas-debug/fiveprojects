/*
 * hvserial_ioctl.c
 * 
 * Manipuladores de IOCTL para o Driver de Porta Serial Hyper-V
 * 
 * Este arquivo contém as implementações dos manipuladores de controle
 * de I/O (IOCTL) para configuração e gerenciamento de portas seriais.
 * 
 * Copyright (c) 2024 Five Projects
 */

#include "hvserial_driver.h"

/*
 * HvSerialEvtIoDeviceControl
 * 
 * Callback para processar requisições de controle de I/O (IOCTL).
 * 
 * Parâmetros:
 *   Queue - Handle da fila de I/O
 *   Request - Handle da requisição
 *   OutputBufferLength - Tamanho do buffer de saída
 *   InputBufferLength - Tamanho do buffer de entrada
 *   IoControlCode - Código de controle IOCTL
 */
VOID
HvSerialEvtIoDeviceControl(
    _In_ WDFQUEUE Queue,
    _In_ WDFREQUEST Request,
    _In_ size_t OutputBufferLength,
    _In_ size_t InputBufferLength,
    _In_ ULONG IoControlCode
)
{
    NTSTATUS status = STATUS_INVALID_DEVICE_REQUEST;
    PDEVICE_CONTEXT deviceContext;
    WDFDEVICE device;

    UNREFERENCED_PARAMETER(OutputBufferLength);
    UNREFERENCED_PARAMETER(InputBufferLength);

    device = WdfIoQueueGetDevice(Queue);
    deviceContext = GetDeviceContext(device);

    KdPrint(("HvSerial: HvSerialEvtIoDeviceControl - Processando IOCTL 0x%x\n", IoControlCode));

    //
    // Processar código de controle
    //
    switch (IoControlCode) {

        case IOCTL_HVSERIAL_GET_PORT_INFO:
            status = HvSerialGetPortInfo(Request, deviceContext);
            break;

        case IOCTL_HVSERIAL_SET_PORT_CONFIG:
            status = HvSerialSetPortConfig(Request, deviceContext);
            break;

        case IOCTL_HVSERIAL_BIND_PHYSICAL_PORT:
            status = HvSerialBindPhysicalPort(Request, deviceContext);
            break;

        case IOCTL_HVSERIAL_UNBIND_PHYSICAL_PORT:
            status = HvSerialUnbindPhysicalPort(deviceContext);
            break;

        case IOCTL_HVSERIAL_GET_STATISTICS:
            status = HvSerialGetStatistics(Request, deviceContext);
            break;

        //
        // IOCTLs padrão de porta serial
        //
        case IOCTL_SERIAL_SET_BAUD_RATE:
        case IOCTL_SERIAL_GET_BAUD_RATE:
        case IOCTL_SERIAL_SET_LINE_CONTROL:
        case IOCTL_SERIAL_GET_LINE_CONTROL:
        case IOCTL_SERIAL_SET_TIMEOUTS:
        case IOCTL_SERIAL_GET_TIMEOUTS:
        case IOCTL_SERIAL_SET_CHARS:
        case IOCTL_SERIAL_GET_CHARS:
        case IOCTL_SERIAL_SET_DTR:
        case IOCTL_SERIAL_CLR_DTR:
        case IOCTL_SERIAL_SET_RTS:
        case IOCTL_SERIAL_CLR_RTS:
        case IOCTL_SERIAL_GET_MODEMSTATUS:
        case IOCTL_SERIAL_GET_COMMSTATUS:
        case IOCTL_SERIAL_GET_PROPERTIES:
            //
            // Para IOCTLs padrão, encaminhar para a porta física se vinculada
            //
            if (deviceContext->IsBound && deviceContext->PhysicalPort) {
                // Aqui seria implementado o encaminhamento para a porta física
                status = STATUS_NOT_IMPLEMENTED;
            } else {
                status = STATUS_INVALID_DEVICE_STATE;
            }
            break;

        default:
            KdPrint(("HvSerial: HvSerialEvtIoDeviceControl - IOCTL não suportado 0x%x\n", IoControlCode));
            status = STATUS_INVALID_DEVICE_REQUEST;
            break;
    }

    //
    // Completar requisição
    //
    WdfRequestCompleteWithInformation(Request, status, 0);
}

/*
 * HvSerialGetPortInfo
 * 
 * Obtém informações sobre a porta serial virtual.
 * 
 * Parâmetros:
 *   Request - Handle da requisição
 *   DeviceContext - Contexto do dispositivo
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialGetPortInfo(
    _In_ WDFREQUEST Request,
    _In_ PDEVICE_CONTEXT DeviceContext
)
{
    NTSTATUS status;
    PSERIAL_PORT_INFO portInfo;
    size_t bufferLength;
    KIRQL oldIrql;

    //
    // Obter buffer de saída
    //
    status = WdfRequestRetrieveOutputBuffer(Request,
                                           sizeof(SERIAL_PORT_INFO),
                                           (PVOID*)&portInfo,
                                           &bufferLength);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialGetPortInfo - Falha ao obter buffer de saída, status=0x%x\n", status));
        return status;
    }

    //
    // Bloquear acesso ao contexto do dispositivo
    //
    KeAcquireSpinLock(&DeviceContext->DeviceLock, &oldIrql);

    //
    // Preencher informações da porta
    //
    RtlZeroMemory(portInfo, sizeof(SERIAL_PORT_INFO));
    
    portInfo->PortNumber = DeviceContext->PortNumber;
    portInfo->IsBound = DeviceContext->IsBound;
    portInfo->IsVirtual = TRUE;
    
    RtlCopyMemory(&portInfo->Config, &DeviceContext->Config, sizeof(SERIAL_PORT_CONFIG));
    RtlCopyMemory(&portInfo->Stats, &DeviceContext->Statistics, sizeof(SERIAL_PORT_STATISTICS));
    
    //
    // Construir nome da porta
    //
    RtlStringCchPrintfW(portInfo->PortName, 
                       64, 
                       L"VCOM%d", 
                       DeviceContext->PortNumber);

    //
    // Liberar spinlock
    //
    KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);

    //
    // Definir tamanho da informação retornada
    //
    WdfRequestSetInformation(Request, sizeof(SERIAL_PORT_INFO));

    KdPrint(("HvSerial: HvSerialGetPortInfo - Informações da porta obtidas com sucesso\n"));

    return STATUS_SUCCESS;
}

/*
 * HvSerialSetPortConfig
 * 
 * Define a configuração da porta serial.
 * 
 * Parâmetros:
 *   Request - Handle da requisição
 *   DeviceContext - Contexto do dispositivo
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialSetPortConfig(
    _In_ WDFREQUEST Request,
    _In_ PDEVICE_CONTEXT DeviceContext
)
{
    NTSTATUS status;
    PSERIAL_PORT_CONFIG config;
    size_t bufferLength;
    KIRQL oldIrql;

    //
    // Obter buffer de entrada
    //
    status = WdfRequestRetrieveInputBuffer(Request,
                                          sizeof(SERIAL_PORT_CONFIG),
                                          (PVOID*)&config,
                                          &bufferLength);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialSetPortConfig - Falha ao obter buffer de entrada, status=0x%x\n", status));
        return status;
    }

    //
    // Validar parâmetros de configuração
    //
    if (config->DataBits < 5 || config->DataBits > 8) {
        KdPrint(("HvSerial: HvSerialSetPortConfig - Bits de dados inválidos: %d\n", config->DataBits));
        return STATUS_INVALID_PARAMETER;
    }

    if (config->Parity > 4) {
        KdPrint(("HvSerial: HvSerialSetPortConfig - Paridade inválida: %d\n", config->Parity));
        return STATUS_INVALID_PARAMETER;
    }

    if (config->StopBits > 2) {
        KdPrint(("HvSerial: HvSerialSetPortConfig - Bits de parada inválidos: %d\n", config->StopBits));
        return STATUS_INVALID_PARAMETER;
    }

    //
    // Bloquear acesso ao contexto do dispositivo
    //
    KeAcquireSpinLock(&DeviceContext->DeviceLock, &oldIrql);

    //
    // Aplicar nova configuração
    //
    RtlCopyMemory(&DeviceContext->Config, config, sizeof(SERIAL_PORT_CONFIG));

    //
    // Se vinculado a uma porta física, aplicar configuração lá também
    //
    if (DeviceContext->IsBound && DeviceContext->PhysicalPort) {
        // Aqui seria implementada a aplicação da configuração à porta física
        // Por enquanto, apenas registramos
        KdPrint(("HvSerial: HvSerialSetPortConfig - Aplicando configuração à porta física\n"));
    }

    //
    // Liberar spinlock
    //
    KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);

    KdPrint(("HvSerial: HvSerialSetPortConfig - Configuração aplicada: BaudRate=%d, DataBits=%d, Parity=%d, StopBits=%d\n",
             config->BaudRate, config->DataBits, config->Parity, config->StopBits));

    return STATUS_SUCCESS;
}

/*
 * HvSerialBindPhysicalPort
 * 
 * Vincula a porta serial virtual a uma porta física.
 * 
 * Parâmetros:
 *   Request - Handle da requisição
 *   DeviceContext - Contexto do dispositivo
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialBindPhysicalPort(
    _In_ WDFREQUEST Request,
    _In_ PDEVICE_CONTEXT DeviceContext
)
{
    NTSTATUS status = STATUS_SUCCESS;
    PULONG portNumber;
    size_t bufferLength;
    KIRQL oldIrql;

    UNREFERENCED_PARAMETER(Request);
    UNREFERENCED_PARAMETER(bufferLength);

    //
    // Obter número da porta física do buffer de entrada
    //
    status = WdfRequestRetrieveInputBuffer(Request,
                                          sizeof(ULONG),
                                          (PVOID*)&portNumber,
                                          &bufferLength);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialBindPhysicalPort - Falha ao obter buffer de entrada, status=0x%x\n", status));
        return status;
    }

    //
    // Validar número da porta
    //
    if (*portNumber == 0 || *portNumber > HVSERIAL_MAX_PORTS) {
        KdPrint(("HvSerial: HvSerialBindPhysicalPort - Número de porta inválido: %d\n", *portNumber));
        return STATUS_INVALID_PARAMETER;
    }

    //
    // Bloquear acesso ao contexto do dispositivo
    //
    KeAcquireSpinLock(&DeviceContext->DeviceLock, &oldIrql);

    //
    // Verificar se já está vinculada
    //
    if (DeviceContext->IsBound) {
        KdPrint(("HvSerial: HvSerialBindPhysicalPort - Porta já está vinculada\n"));
        KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);
        return STATUS_DEVICE_ALREADY_ATTACHED;
    }

    //
    // Aqui seria implementada a vinculação real à porta física
    // Por enquanto, apenas marcamos como vinculada
    //
    DeviceContext->PortNumber = *portNumber;
    DeviceContext->IsBound = TRUE;
    DeviceContext->PhysicalPort = NULL; // Seria definido com a referência real

    //
    // Liberar spinlock
    //
    KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);

    KdPrint(("HvSerial: HvSerialBindPhysicalPort - Porta vinculada com sucesso à COM%d\n", *portNumber));

    return STATUS_SUCCESS;
}

/*
 * HvSerialUnbindPhysicalPort
 * 
 * Desvincula a porta serial virtual da porta física.
 * 
 * Parâmetros:
 *   DeviceContext - Contexto do dispositivo
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialUnbindPhysicalPort(
    _In_ PDEVICE_CONTEXT DeviceContext
)
{
    KIRQL oldIrql;

    //
    // Bloquear acesso ao contexto do dispositivo
    //
    KeAcquireSpinLock(&DeviceContext->DeviceLock, &oldIrql);

    //
    // Verificar se está vinculada
    //
    if (!DeviceContext->IsBound) {
        KdPrint(("HvSerial: HvSerialUnbindPhysicalPort - Porta não está vinculada\n"));
        KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);
        return STATUS_INVALID_DEVICE_STATE;
    }

    //
    // Desvincular porta física
    //
    DeviceContext->IsBound = FALSE;
    DeviceContext->PhysicalPort = NULL;

    //
    // Liberar spinlock
    //
    KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);

    KdPrint(("HvSerial: HvSerialUnbindPhysicalPort - Porta desvinculada com sucesso\n"));

    return STATUS_SUCCESS;
}

/*
 * HvSerialGetStatistics
 * 
 * Obtém estatísticas de uso da porta serial.
 * 
 * Parâmetros:
 *   Request - Handle da requisição
 *   DeviceContext - Contexto do dispositivo
 * 
 * Retorna:
 *   STATUS_SUCCESS se bem-sucedido
 *   Código de erro NTSTATUS caso contrário
 */
NTSTATUS
HvSerialGetStatistics(
    _In_ WDFREQUEST Request,
    _In_ PDEVICE_CONTEXT DeviceContext
)
{
    NTSTATUS status;
    PSERIAL_PORT_STATISTICS stats;
    size_t bufferLength;
    KIRQL oldIrql;

    //
    // Obter buffer de saída
    //
    status = WdfRequestRetrieveOutputBuffer(Request,
                                           sizeof(SERIAL_PORT_STATISTICS),
                                           (PVOID*)&stats,
                                           &bufferLength);

    if (!NT_SUCCESS(status)) {
        KdPrint(("HvSerial: HvSerialGetStatistics - Falha ao obter buffer de saída, status=0x%x\n", status));
        return status;
    }

    //
    // Bloquear acesso ao contexto do dispositivo
    //
    KeAcquireSpinLock(&DeviceContext->DeviceLock, &oldIrql);

    //
    // Copiar estatísticas
    //
    RtlCopyMemory(stats, &DeviceContext->Statistics, sizeof(SERIAL_PORT_STATISTICS));

    //
    // Liberar spinlock
    //
    KeReleaseSpinLock(&DeviceContext->DeviceLock, oldIrql);

    //
    // Definir tamanho da informação retornada
    //
    WdfRequestSetInformation(Request, sizeof(SERIAL_PORT_STATISTICS));

    KdPrint(("HvSerial: HvSerialGetStatistics - Estatísticas obtidas: TX=%lld, RX=%lld\n",
             stats->BytesTransmitted, stats->BytesReceived));

    return STATUS_SUCCESS;
}
